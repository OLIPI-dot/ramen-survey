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

    const textLower = text.toLowerCase();

    // 1. レビュー (感想, 評価, 検証)
    if (/(感想|レビュー|評価|検証|使ってみた|プレイレポ|徹底比較|実機)/.test(textLower)) {
        if (/(号泣|ショット|反響|話題|sns|共感|ファン|衝撃)/.test(textLower)) {
            scores['話題'] += 40; 
        } else {
            // タイトルに「レビュー」があれば最優先
            if (textLower.includes('レビュー')) scores['レビュー'] += 100;
            else scores['レビュー'] += 50;
        }
    }
    
    // 2. エンタメ (芸能, 映画, 音楽, アニメ, ドラマ)
    if (/(芸能|映画|音楽|アニメ|ドラマ|出演|放送|主演|監督|ライブ|アイドル|舞台|声優)/.test(textLower)) {
        scores['エンタメ'] += 45;
    }

    // 3. コラム (解説, 考察, 分析, 読み物, 理由, なぜ, 背景, 仕組み)
    if (/(解説|考察|分析|読み物|理由|なぜ|とは|仕組み|背景|ヒント|秘話)/.test(textLower)) {
        scores['コラム'] += 45;
    }
    
    // 4. ネタ・話題 (面白い, 話題, 驚き, 謎, 爆笑, 癒やし, 衝撃)
    if (/(面白い|話題|驚き|謎|爆笑|癒やし|衝撃|不思議|あるある|snsで|バズ|物議)/.test(textLower)) {
        scores['話題'] += 35;
    }

    // 5. らび (うさぎ, 人参, 運営, 広場, 目標)
    if (/(うさぎ|人参|にんじん|広場を盛り上げ|運営方針|らびのひとりごと|みんなの投票広場)/.test(textLower)) {
        scores['らび'] += 100;
    }

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
    if (finalCategory === 'らび' && /(芸能|ニュース|事件|事故|話題|sns|トレンド)/.test(textLower)) {
        finalCategory = 'ニュース';
    }

    return finalCategory;
}

/**
 * 🏷️ カテゴリとタグを賢く導き出す魔法らび！（チャッピー式・強化版2.0）
 */
function generateTags(title, content) {
    const titleLower = title.toLowerCase();
    const contentLower = (content || '').toLowerCase();
    const fullText = titleLower + ' ' + contentLower;
    
    const tagScores = {};
    const addTag = (tag, score = 1) => {
        if (!tag || tag.length < 2) return; // 1文字以下のタグはノイズなので除外
        tagScores[tag] = (tagScores[tag] || 0) + score;
    };

    // 1. 🔍 ジャンル（大項目）の検出
    const genres = [
        { name: 'AI', keywords: ['ai', '人工知能', '生成ai', 'gpt', 'llm', 'openai', 'claude', 'gemini', '深層学習'] },
        { name: 'ゲーム', keywords: ['新作ゲーム', 'ゲーム攻略', 'プレイ動画', 'eスポーツ', 'ニンテンドー', 'プレイステーション', 'カービィ', 'ポケモン', 'マリオ'] },
        { name: 'スマホ', keywords: ['スマホ', 'スマートフォン', 'iphone', 'android', 'pixel', 'galaxy', 'xperia', 'nothing'] },
        { name: 'IT・技術', keywords: ['アプリ', 'ガジェット', 'web', '開発', 'プログラミング', 'クラウド', 'サイバー', 'fax', 'プリンタ'] },
        { name: 'エンタメ', keywords: ['映画', 'ドラマ', 'アニメ', '芸能', '俳優', 'アイドル', 'アーティスト', 'ライブ', 'イベント', '声優', 'プロデュース', 'asmr'] },
        { name: '経済', keywords: ['株価', 'ビジネス', '投資', '円安', '賃上げ', '決算', '銀行', '市場'] },
        { name: 'ライフスタイル', keywords: ['グルメ', '料理', '健康', '掃除', '節約', '旅行', 'ファッション', '子育て'] },
        { name: 'スポーツ', keywords: ['プロ野球', '大谷', 'サッカー', 'ゴルフ', 'テニス', '五輪', 'マラソン', '格闘技'] }
    ];

    genres.forEach(g => {
        g.keywords.forEach(kw => {
            if (titleLower.includes(kw)) addTag(g.name, 10);
            else if (contentLower.includes(kw)) addTag(g.name, 3);
        });
    });

    // 2. 🔍 サブタグ（詳細・ブランド名など）
    const subTags = [
        { name: 'Apple', keywords: ['apple', 'iphone', 'ipad', 'mac', 'macbook', 'watch'] },
        { name: 'Google', keywords: ['google', 'android', 'pixel', 'youtube', 'gemini', 'workspace'] },
        { name: 'Nothing', keywords: ['nothing', 'phone', 'ear'] },
        { name: 'Sony', keywords: ['sony', 'ソニー', 'ps5', 'playstation', 'ウォークマン'] },
        { name: 'Nintendo', keywords: ['nintendo', '任天堂', 'スイッチ', 'switch'] },
        { name: 'カービィ', keywords: ['カービィ', 'kirby'] },
        { name: 'ポケモン', keywords: ['ポケモン', 'pokemon', 'ピカチュウ'] },
        { name: 'マリオ', keywords: ['マリオ', 'mario'] },
        { name: 'Microsoft', keywords: ['microsoft', 'windows', 'xbox', 'copilot', 'azure'] },
        { name: 'OpenAI', keywords: ['openai', 'chatgpt', 'dall-e', 'sora'] },
        { name: 'Amazon', keywords: ['amazon', 'kindle', 'prime', 'aws'] },
        { name: 'イーロン・マスク', keywords: ['マスク', 'musk', 'tesla', 'spacex', 'x.com'] },
        { name: '浪川大輔', keywords: ['浪川大輔', '浪川'] },
        { name: 'FAX', keywords: ['fax', 'ファックス'] },
        { name: 'イヤホン', keywords: ['イヤホン', 'ヘッドホン', 'オーディオ'] }
    ];

    subTags.forEach(s => {
        s.keywords.forEach(kw => {
            if (titleLower.includes(kw)) addTag(s.name, 12);
            else if (contentLower.includes(kw)) addTag(s.name, 5);
        });
    });

    // 3. 🔍 引用符（「」『』“ ”）からの特徴語抽出
    const quoteRegex = /[「『“"“‘]([^「」『』“”"‘’]{2,10})[」』”"”’]/g;
    let match;
    while ((match = quoteRegex.exec(title)) !== null) {
        const word = match[1].trim();
        // 記号のみや短すぎるものは除外
        if (word.length >= 2 && !/^[0-9]+$/.test(word)) {
            addTag(word, 15); // 引用符内は非常に重要なので高スコア
        }
    }

    // 4. 🏆 【】内の固有名詞抽出（ノイズ除去済）
    const brackets = title.match(/【([^】]+)】/g);
    if (brackets) {
        brackets.forEach(b => {
            const word = b.replace(/[【】]/g, '').trim();
            if (word.length >= 2 && word.length <= 12 && !/速報|まとめ|更新|一覧|動画/.test(word)) {
                addTag(word, 10);
            }
        });
    }

    // 5. 🧪 カタカナ固有名詞の簡易抽出（3文字以上のカタカナ連続）
    const katakanaRegex = /[ァ-ヶー]{3,20}/g; // 20文字まで拡張らび！
    const noiseWords = ['ショット', 'ニュース', '話題', '最新', '公開', '決定', '開始', '終了', '更新', '一覧', '比較', 'ランキング', 'まとめ', 'ちゃん', 'くん', 'さん'];
    
    while ((match = katakanaRegex.exec(title)) !== null) {
        const word = match[0];
        // ノイズワードでなければ追加
        if (!noiseWords.includes(word) && !/レビュー|考察|解説/.test(word)) {
            addTag(word, 5);
        }
    }

    // 6. 🛡️ 特別アクション（レビュー・考察等）
    if (titleLower.includes('レビュー')) addTag('レビュー', 8);
    if (titleLower.includes('解説') || titleLower.includes('考察')) addTag('考察', 5);

    // 7. 🥇 スコア順にソートして抽出
    let sortedTags = Object.entries(tagScores)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

    // 重複除去（全角半角の差など）
    sortedTags = [...new Set(sortedTags)];

    // 8. 🛡️ 最低2タグ保証
    if (sortedTags.length < 1) sortedTags.push('話題');
    if (sortedTags.length < 2) sortedTags.push('ニュース');

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

    // 🛡️ SEO強化: 重複チェック (過去100件まで拡大 & 正規化マッチング)
    const { data: recentSurveys } = await supabase
        .from('surveys')
        .select('title')
        .order('created_at', { ascending: false })
        .limit(100);

    const normalize = (t) => (t || '').replace(/[\s\t\n\r、。！？！？！？!?,.．．…—―-]/g, '').toLowerCase();
    const recentNormTitles = new Set(recentSurveys?.map(s => normalize(s.title)) || []);

    let count = 0;
    const categoryCounts = {};

    for (const news of allNews) {
        if (count >= 8) break; // 💡 投稿数を少し絞って質を上げるらび
        
        // 重複チェック
        if (recentNormTitles.has(normalize(news.title))) continue;

        // 📝 内容が薄すぎるものはスキップ (SEO対策)
        if (!news.description || news.description.length < 50) continue;

        try {
            const cat = news.category;
            // 💡 1回の実行で各カテゴリの数を制限
            if (categoryCounts[cat] >= (cat === 'ニュース' ? 2 : 1)) continue;

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
