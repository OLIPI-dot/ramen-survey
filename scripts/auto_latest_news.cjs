const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env から環境変数を手動で読み込むらび！
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const IS_DRY_RUN = process.argv.includes('--dry-run');
const LOG_FILE = path.join(__dirname, '..', 'labi_auto_post.log');

function log(msg) {
    const timestamp = new Date().toLocaleString('ja-JP');
    const logMsg = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, logMsg);
}

const RSS_FEEDS = [
    'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    'https://news.yahoo.co.jp/rss/categories/it.xml',
    'https://news.yahoo.co.jp/rss/categories/entertainment.xml',
    'https://gigazine.net/news/rss_2.0/',
    'https://rss.itmedia.co.jp/rss/2.0/itlab_all.xml',
    'https://www3.nhk.or.jp/rss/news/shuyo.xml'
];

async function searchYouTubeVideo(query) {
    try {
        const refined = query.length < 50 ? `${query} ニュース` : query;
        const res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(refined)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = res.data;
        
        // 💡 最初の「videoId」を確実に当てる
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match) return `yt:${match[1]}`;
        
        const watchMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (watchMatch) return `yt:${watchMatch[1]}`;
    } catch (e) {}
    return null;
}

function stripHtml(str) {
    if (!str) return '';
    return str
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#45;/g, '-')
        .replace(/(\s*(?:続きを読む|続きを[読よ]む|詳細はこちら|詳細を見る|Read more|…|[\. ]{2,}|[\s\.\-]+$))+/gi, '') // 💡 文末だけでなく全体から「続きを読む」的なものを消去
        .trim();
}

/**
 * 💡 2026/03/20 パーフェクト版 カテゴリ判定エンジン
 */
function classifyNews(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    // カテゴリスコア定義
    const scores = {
        'ニュース': 10,
        'エンタメ': 0,
        '話題': 0,
        'レビュー': 0,
        'コラム': 0,
        'ネタ': 0,
        'らび': 0
    };

    // 1. レビュー (感想, 評価, 検証)
    if (/(感想|レビュー|評価|検証|使ってみた|プレイレポ|徹底比較|実機)/.test(text)) {
        if (/(号泣|ショット|反響|話題|SNS|共感|ファン|衝撃)/.test(text)) scores['話題'] += 40; 
        else scores['レビュー'] += 50;
    }
    
    // 2. エンタメ (芸能, 映画, 音楽, アニメ, ドラマ)
    if (/(芸能|映画|音楽|アニメ|ドラマ|出演|放送|主演|監督|ライブ|アイドル)/.test(text)) scores['エンタメ'] += 45;

    // 3. コラム (解説, 考察, 分析, 読み物, 理由, なぜ)
    if (/(解説|考察|分析|読み物|理由|なぜ|とは|仕組み|背景)/.test(text)) scores['コラム'] += 40;
    
    // 4. ネタ・話題 (面白い, 話題, 驚き, 謎, 爆笑, 癒やし, 衝撃)
    if (/(面白い|話題|驚き|謎|爆笑|癒やし|衝撃|不思議|あるある|SNSで)/.test(text)) scores['話題'] += 35;

    // 5. らび (うさぎ, 人参, 運営, 広場, 目標)
    if (/(うさぎ|人参|にんじん|広場を盛り上げ|運営方針|らびのひとりごと|みんなの投票広場)/.test(text)) scores['らび'] += 100;

    // 💡 2026/03/23 追加: 「可愛い」だけでは「らび」にしない
    // ニュースの中に「可愛い」があっても、それはらびではなく対象（芸能人など）のことならび！

    // スコアが最大のものを採用。同点ならニュース
    let finalCategory = 'ニュース';
    let maxScore = 5; // 最低しきい値

    for (const [cat, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            finalCategory = cat;
        }
    }

    // 🛡️ 最終防御: 内容に「可愛い」が入っていても、芸能やニュース寄りのキーワードがあれば「ニュース」に引き戻す
    if (finalCategory === 'らび' && /(芸能|ニュース|事件|事故|話題|SNS|トレンド)/.test(text)) {
        finalCategory = 'ニュース';
    }

    return finalCategory;
}

/**
 * 🏷️ カテゴリとタグを賢く導き出す魔法らび！（チャッピー式・強化版）
 */
function generateTags(title, content) {
    const titleLower = title.toLowerCase();
    const contentLower = (content || '').toLowerCase();
    const fullText = titleLower + ' ' + contentLower;
    
    const tagScores = {};
    const addTag = (tag, score = 1) => {
        tagScores[tag] = (tagScores[tag] || 0) + score;
    };

    // 1. 🔍 ジャンル（大項目）の検出: スコア 2
    const genres = [
        { name: 'ゲーム', keywords: ['ゲーム', '新作', '発売', 'プレイ', '攻略', 'switch', 'ps5', 'xbox', 'steam', 'スマホゲー'] },
        { name: 'IT・技術', keywords: ['ai', 'スマホ', 'アプリ', 'ガジェット', 'web', '開発', 'openai', 'google', 'apple', 'microsoft'] },
        { name: 'エンタメ', keywords: ['映画', 'ドラマ', 'アニメ', '芸能', '俳優', 'アイドル', 'youtuber', 'vtuber', 'ライブ', 'イベント'] },
        { name: '経済', keywords: ['株価', 'ビジネス', '投資', '円安', '賃上げ', '決算', '銀行'] },
        { name: 'ライフスタイル', keywords: ['グルメ', '料理', '健康', '掃除', '節約', '旅行', 'ファッション'] },
        { name: 'スポーツ', keywords: ['プロ野球', '大谷', 'サッカー', 'ゴルフ', 'テニス', '五輪', 'マラソン'] }
    ];

    genres.forEach(g => {
        g.keywords.forEach(kw => {
            if (titleLower.includes(kw)) addTag(g.name, 4); // タイトルなら強力
            else if (contentLower.includes(kw)) addTag(g.name, 2);
        });
    });

    // 2. 🔍 サブタグ（詳細）の検出: スコア 3
    const subTags = [
        { name: 'Switch', keywords: ['switch', 'スイッチ'] },
        { name: 'PS5', keywords: ['ps5', 'playstation', 'プレステ'] },
        { name: 'Steam', keywords: ['steam'] },
        { name: 'Apple', keywords: ['apple', 'iphone', 'ipad', 'mac'] },
        { name: 'Google', keywords: ['google', 'android', 'pixel'] },
        { name: '任天堂', keywords: ['nintendo', '任天堂', 'ポケモン', 'マリオ', 'ピクミン'] },
        { name: 'ソニー', keywords: ['sony', 'ソニー'] },
        { name: 'Microsoft', keywords: ['microsoft', 'windows', 'xbox'] },
        { name: 'YouTuber', keywords: ['youtuber', 'ユーチューバー'] },
        { name: 'VTuber', keywords: ['vtuber', 'ブイチューバー'] }
    ];

    subTags.forEach(s => {
        s.keywords.forEach(kw => {
            if (titleLower.includes(kw)) addTag(s.name, 5); // タイトルなら激強
            else if (contentLower.includes(kw)) addTag(s.name, 3);
        });
    });

    // 3. 🛡️ ニュース速報性の検出
    const isBreaking = ['発表', '決定', '公開', '発売', '開始', '解禁', '速報'].some(kw => fullText.includes(kw));
    if (isBreaking) addTag('ニュース', 2);

    // 4. 🏆 【】内の固有名詞抽出: スコア 3 (ノイズ除去)
    const brackets = title.match(/【([^】]+)】/g);
    if (brackets) {
        brackets.forEach(b => {
            const word = b.replace(/[【】]/g, '').trim();
            if (word.length >= 2 && word.length <= 12 && !/速報|まとめ|更新|一覧/.test(word)) {
                addTag(word, 3);
            }
        });
    }

    // 5. 🥇 スコア順にソートして抽出
    let sortedTags = Object.entries(tagScores)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

    // 6. 🛡️ 最低2タグ保証
    if (sortedTags.length < 1) sortedTags.push('ニュース');
    if (sortedTags.length < 2) sortedTags.push('話題');

    // 最大4個
    return sortedTags.slice(0, 4);
}

/**
 * 💡 OGPから説明文を補完する
 */
async function fetchOgpDescription(url) {
    try {
        const res = await axios.get(url, { timeout: 5000 });
        const html = res.data;
        const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i);
        if (ogDesc) return stripHtml(ogDesc[1]);
        const metaDesc = html.match(/<meta name="description" content="([^"]+)"/i);
        if (metaDesc) return stripHtml(metaDesc[1]);
    } catch (e) {
        log(`[OGP Fetch Error] ${url} -> ${e.message}`);
    }
    return null;
}

async function startAutoPosting() {
    log('🚀 自動投稿エンジン起動らび！ ' + (IS_DRY_RUN ? ' (DRY RUN MODE)' : ''));
    let allNews = [];

    for (const feed of RSS_FEEDS) {
        try {
            const res = await axios.get(feed, { timeout: 10000 });
            const items = res.data.match(/<item>([\s\S]*?)<\/item>/g) || [];

            for (const item of items) {
                const title = stripHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
                const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1];
                let description = stripHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1]);

                if (!title || !link) continue;

                // 📝 説明文が空または短すぎる場合はOGPから取得を試みる
                if (!description || description.length < 30) {
                    const ogpDesc = await fetchOgpDescription(link);
                    if (ogpDesc && ogpDesc.length > (description || '').length) {
                        description = ogpDesc;
                    }
                }

                const cat = classifyNews(title, description);
                const tags = generateTags(title, description);
                allNews.push({ title, link, description, category: cat, tags });
            }
        } catch (e) {
            log(`RSS取得失敗: ${feed} -> ${e.message}`);
        }
    }

    // 重複チェック
    const { data: recentSurveys } = await supabase.from('surveys').select('title').order('created_at', { ascending: false }).limit(20);
    const recentTitles = new Set(recentSurveys?.map(s => s.title) || []);

    let count = 0;
    const categoryCounts = {};

    for (const news of allNews) {
        if (count >= 10) break;
        if (recentTitles.has(news.title)) continue;

        try {
            const cat = news.category;
            if (categoryCounts[cat] >= (cat === 'ニュース' ? 3 : 1)) continue;

            // YouTube検索
            let video = await searchYouTubeVideo(news.title);
            let imageUrl = video || '';

            // 📰 動画が見つからない場合のデフォルト画像 (ニュースカテゴリのみ)
            if (!imageUrl && news.category === 'ニュース') {
                imageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1000';
            }

            if (IS_DRY_RUN) {
                log(`[DRY RUN] 投稿: ${news.title} [${news.category}] Tags:[${news.tags.join(', ')}]`);
                count++;
                continue;
            }

            const surveyTitle = news.title.slice(0, 100);
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            // 📝 説明文の末尾に「[続きを読む](URL)」を挿入するらび！ (UI側で装飾されるよ)
            const finalDescription = (news.description || '') + `\n\n[続きを読む](${news.link})`;

            const { data: sData, error: sErr } = await supabase.from('surveys').insert([{
                title: surveyTitle,
                category: news.category,
                image_url: imageUrl,
                description: finalDescription,
                deadline: deadline.toISOString(),
                visibility: 'public',
                is_official: true,
                tags: news.tags || []
            }]).select();

            if (sErr) throw sErr;
            const surveyId = sData[0].id;

            // 選択肢の追加
            const options = ['賛成・良いと思う', '反対・う～ん…', 'どちらとも言えない', '興味がある・期待！'];
            await supabase.from('options').insert(options.map(name => ({
                survey_id: surveyId,
                name,
                votes: 0
            })));

            // らびのコメント投稿
            const reactions = [
                '最新のニュースをお届けするらび！世の中の動きに注目らびね。',
                'これについて、みんなはどう思うらび？🐰🥕',
                '興味深い内容らび！みんなの意見を聞かせてほしいらび。',
                'すごいニュースらび！ワクワクするらびね。',
                'これは見逃せないらびっ！みんなで語り合うらび。'
            ];
            const reaction = reactions[Math.floor(Math.random() * reactions.length)];
            const rabiComment = `【らび🐰のひとりごと】\n${reaction}`;

            await supabase.from('comments').insert([{
                survey_id: surveyId,
                user_name: 'らび🐰(AI)',
                content: rabiComment,
                edit_key: 'labi_bot'
            }]);

            log(`✅ 投稿完了: ${news.title} (${news.category})`);
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            count++;
        } catch (e) {
            log(`❌ 投稿失敗: ${news.title} -> ${e.message}`);
        }
    }

    log(`✨ 自動投稿完了らび！合計: ${count}件`);
}

startAutoPosting();
