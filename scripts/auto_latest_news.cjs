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
    'https://logtube.jp/feed/',
    'https://realsound.jp/tech/index.xml'
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
        .replace(/(\s*(?:続きを読む|続きを[読よ]む|詳細はこちら|詳細を見る|Read more|…|[\. ]{2,}|[\s\.\-]+$))+/gi, '')
        .replace(/\s+/g, ' ') // 💡 余分な空白を1つにまとめるらび！
        .trim();
}

/**
 * 🕵️ ニュースの内容から最適なカテゴリを分類するロジックらび！
 */
function classifyNews(title, description) {
    const textLower = (title + ' ' + (description || '')).toLowerCase();
    const scores = {
        'ニュース': 10,
        'エンタメ': 0,
        '話題': 0,
        'レビュー': 0,
        'コラム': 0,
        'ネタ': 0,
        'YouTuber': 0,
        'らび': 0
    };

    // 🛡️ 大手テック・ガジェット配信サイトの保護 (誤ってYouTuberにならないようにするらび！)
    const isTrustedTechSite = /watch\.impress\.co\.jp|itmedia\.co\.jp|mynavi\.jp|ascii\.jp|gizmodo\.jp|phileweb\.com|digitallife\.jp/.test(description || '');
    if (isTrustedTechSite) {
        scores['ニュース'] += 80;
    }

    // 0. YouTuber (特定のサイト or キーワード)
    const isYouTuberSite = /logtube\.jp|realsound\.jp\/tech/.test(description || '');
    if (isYouTuberSite) {
        // 💡 サイト名だけで決めつけず、本文にYouTube要素があるか確認らび！
        if (/(youtuber|youtube|ユーチューバー|配信者|実況者|動画撮影|動画投稿|チャンネル登録)/i.test(textLower)) {
            scores['YouTuber'] += 100;
        } else {
            scores['ニュース'] += 50; // ITニュース寄りにする
        }
    } else if (/(ヒカキン|hikakin|はじめしゃちょー|ヒカル|フィッシャーズ|東海オンエア|スカイピース|コムドット|平成フラミンゴ|キヨ|レトルト|ぽきん|ポッキー|兄者弟者|壱百満天原サロメ|にじさんじ|ホロライブ|vtuber|ブレイキングダウン|朝倉未来|ばんばんざい|中町綾|とうあ|しなこ|むくえな|すとぷり|騎士a|ちょんまげ小僧|バンカラジオ|フォーエイト|48|いれいす|あざみ|あまぷた|アンプタック|キヨ|レトルト|牛沢|ガッチマン|加藤純一|うんこちゃん|もこう|shaka|関優太|stylishnoob|kuzuha|葛葉|叶|ぺこら|マリン|サロメ|三枝明那|ローレン|不破湊|湊あくあ|キズナアイ|桐崎栄二|ウチら3姉妹|水溜りボンド|pds|めぐみ|瀬戸弘司|カズチャンネル|よりひと|コレコレ|ポケカメン|まぜ太|あっと|てるとくん|ばぁう|そうま|しゆん)/i.test(textLower)) {
        // 🛡️ 芸能人・有名人フィルタ: YouTuberとしても有名だが、俳優・アイドル等の側面が強い人はエンタメを優先
        if (/(前田敦子|指原莉乃|中川翔子|本田翼|広瀬アリス|橋本環奈|川口春奈|江頭)/.test(textLower)) {
            scores['エンタメ'] += 80;
            scores['話題'] += 40;
            scores['YouTuber'] += 30; // 💡 完全に0にはしないが、順位を下げるらび！
        } else {
            scores['YouTuber'] += 100; // 専業YouTuberなら自信を持って！
        }
    } else if (/(youtuber|youtube|ユーチューバー|配信者|実況者|動画撮影|動画投稿|チャンネル登録)/i.test(textLower)) {
        // 大手テックサイトなら、キーワードだけではYouTuberにしないらび
        if (!isTrustedTechSite) {
            scores['YouTuber'] += 30; 
        }
    }

    // 1. ニュース / IT・ガジェット (iphone, スマホ, 発表, 発売)
    if (/(iphone|android|pixel|スマホ|スマートフォン|ソフトバンク|ドコモ|au|楽天モバイル|mnp|発売|発表|決定|開始|終了|解禁|公開|判明|アプデ|更新|脆弱性)/i.test(textLower)) {
        scores['ニュース'] += 60;
    }

    // 2. エンタメ (芸能, 映画, 音楽, アニメ, ドラマ)
    if (/(芸能|映画|音楽|アニメ|ドラマ|出演|放送|主演|監督|ライブ|アイドル|舞台|声優|紅白|結婚|離婚|熱愛|ジャニーズ|akb|坂道|卒業)/.test(textLower)) {
        scores['エンタメ'] += 60; // 💡 芸能系は強めに盛り上げるらび！
    }

    // 3. 話題・ニュース・衝撃 (号泣, ショット, 反響, sns, 衝撃)
    if (/(話題|反響|ショット|号泣|絶賛|衝撃|snsで|バズ|物議|物議を醸す|称賛|批判|炎上|困惑|驚き)/.test(textLower)) {
        scores['話題'] += 55;
    }

    // 4. レビュー (感想, 評価, 検証)
    if (/(感想|レビュー|評価|検証|使ってみた|プレイレポ|徹底比較|実機)/.test(textLower)) {
        if (textLower.includes('レビュー')) scores['レビュー'] += 100;
        else scores['レビュー'] += 50;
    }
    
    // 5. コラム (解説, 考察, 分析, 読み物, 理由, なぜ)
    if (/(解説|考察|分析|読み物|理由|なぜ|とは|仕組み|背景|ヒント|秘話)/.test(textLower)) {
        scores['コラム'] += 50;
    }

    // 6. ネタ (面白い, 爆笑, 癒やし, 不思議, あるある)
    if (/(面白い|爆笑|癒やし|不思議|あるある|おもしろ|ネタ)/.test(textLower)) {
        scores['ネタ'] += 50;
    }

    // 7. らび (うさぎ, 人参, 運営)
    if (/(うさぎ|人参|にんじん|広場を盛り上げ|運営方針|らびのひとりごと)/.test(textLower)) {
        scores['らび'] += 100;
    }

    // スコアが最大のものを採用
    let finalCategory = 'ニュース';
    let maxScore = 5;

    for (const [cat, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            finalCategory = cat;
        }
    }

    // 🛡️ 最終防御: 芸能ニュースでかつ「話題」や「エンタメ」に振り分けたいケース
    if (finalCategory === 'ニュース' && /(芸能|アイドル|女優|俳優|歌手)/.test(textLower)) {
        if (/(話題|反響|ショット|私服|家族|愛猫)/.test(textLower)) finalCategory = '話題';
        else finalCategory = 'エンタメ';
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
        { name: 'スポーツ', keywords: ['プロ野球', '大谷', 'サッカー', 'ゴルフ', 'テニス', '五輪', 'マラソン', '格闘技'] },
        { name: 'YouTuber', keywords: ['youtuber', 'youtube', 'ユーチューバー', '配信者', '実況者', 'uuum', 'クリエイター'] }
    ];

    genres.forEach(g => {
        g.keywords.forEach(kw => {
            if (titleLower.includes(kw)) addTag(g.name, 10);
            else if (contentLower.includes(kw)) addTag(g.name, 3);
        });
    });

    // 2. 🔍 サブタグ（詳細・ブランド名など）
    const subTags = [
        { name: 'ヒカキン', keywords: ['ヒカキン', 'hikakin', 'まるお', 'もふこ'] },
        { name: 'はじめしゃちょー', keywords: ['はじめしゃちょー', 'hajime'] },
        { name: 'ヒカル', keywords: ['ヒカル', 'hikaru', 'nextstage', 'ネクステ'] },
        { name: '東海オンエア', keywords: ['東海オンエア', 'てつや', 'しばゆー', 'りょう', 'としみつ', 'ゆめまる', '虫眼鏡'] },
        { name: 'フィッシャーズ', keywords: ['フィッシャーズ', 'fischers', 'シルク'] },
        { name: 'コムドット', keywords: ['コムドット', 'やまと'] },
        { name: 'にじさんじ', keywords: ['にじさんじ', 'nijisanji', '葛葉', '叶', 'サロメ'] },
        { name: 'ホロライブ', keywords: ['ホロライブ', 'hololive', 'ぺこら', 'マリン', 'フブキ'] },
        { name: 'VTuber', keywords: ['vtuber', 'ブイチューバー', 'バーチャルyoutuber'] },
        { name: 'Apple', keywords: ['apple', 'iphone', 'ipad', 'macbook', 'mac mini', 'mac studio', 'imac', 'apple watch', 'iwatch', 'ios', 'macos'] },
        { name: 'Google', keywords: ['google', 'android', 'pixel', 'gemini', 'workspace'] },
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
            const res = await axios.get(feed, { 
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const items = res.data.match(/<item>([\s\S]*?)<\/item>/g) || [];

            for (const item of items) {
                const title = stripHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
                const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1];
                let description = stripHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1]);

                if (!title || !link) continue;

                // 📝 説明文が短すぎる（切り詰められている可能性が高い）場合はOGPから取得を試みるらび！
                if (!description || description.length < 200) {
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

    // 🛡️ SEO強化: 重複チェック (URL ＆ タイトル正規化)
    // 過去1000件のタイトルと説明文を取得してURLを抽出するらび！
    const { data: recentSurveys } = await supabase
        .from('surveys')
        .select('title, description')
        .order('created_at', { ascending: false })
        .limit(1000);

    // タイトルの正規化関数 (記号や空白を消して小文字に)
    const normalize = (t) => {
        let text = t || '';
        // 決まり文句のプレフィックスを削除
        text = text.replace(/^【(速報|更新|最新|注目|重要)】/i, '');
        text = text.replace(/^\[(新着|修正|告知)\]/i, '');
        // 記号類をすべて削除
        return text.replace(/[\s\t\n\r、。！？「」『』“”"‘’!?,.．．…—―‐－\(\)（）\[\]［］【】]/g, '').toLowerCase();
    };

    const recentNormTitles = new Set(recentSurveys?.map(s => normalize(s.title)) || []);
    
    // 説明文の最後にある [続きを読む](URL) からURLを抽出するらび！
    const recentLinks = new Set(recentSurveys?.map(s => {
        const match = s.description?.match(/\[続きを読む\]\((.*?)\)/);
        return match ? match[1].trim() : null;
    }).filter(l => l) || []);

    let count = 0;
    const categoryCounts = {};

    // 🕒 JST（日本時間）の現在時刻を取得して投稿数を調整するらび！
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;
    
    let maxPosts = 8;
    let maxPerCategory = 1;
    let newsMax = 2;

    if (jstHour >= 19 && jstHour <= 23) {
        // ✨ 夜のゴールデンタイム！一気に盛り上げるらび！
        maxPosts = 15;
        maxPerCategory = 3;
        newsMax = 4;
    } else if (jstHour === 12 || (jstHour >= 7 && jstHour <= 8)) {
        // 🍱 ランチ or 朝の通勤タイム！多めに流すらび！
        maxPosts = 12;
        maxPerCategory = 2;
        newsMax = 3;
    } else if (jstHour >= 2 && jstHour <= 5) {
        // 😴 深夜はお休みモードらび…
        maxPosts = 3;
        maxPerCategory = 1;
        newsMax = 1;
    }

    log(`[Dynamic Limit] JST ${jstHour}時なので、最大 ${maxPosts}件（ニュースは${newsMax}件まで）投稿するらび！`);

    for (const news of allNews) {
        if (count >= maxPosts) break; 
        
        // 1. URLによる絶対的な重複チェック
        if (recentLinks.has(news.link.trim())) {
            log(`[Skip] URLが重複しています: ${news.title}`);
            continue;
        }

        // 2. 正規化タイトルによる重複チェック
        const normCurrent = normalize(news.title);
        if (recentNormTitles.has(normCurrent)) {
            log(`[Skip] タイトルが実質的に重複しています: ${news.title}`);
            continue;
        }

        // 📝 内容が薄すぎるものはスキップ (SEO対策)
        if (!news.description || news.description.length < 50) continue;

        try {
            const cat = news.category;
            // 💡 実行時のダイナミックリミットを適用 (ニュースを優先)
            const isNewsLike = (cat === 'ニュース' || cat === 'その他');
            const currentCatMax = (isNewsLike ? newsMax : maxPerCategory);
            if (categoryCounts[cat] >= currentCatMax) continue;

            // YouTube検索
            let video = await searchYouTubeVideo(news.title);
            let imageUrl = video || '';

            // 📰 動画が見つからない場合のデフォルト画像 (ニュースカテゴリのみ)
            if (!imageUrl && news.category === 'ニュース') {
                imageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1000';
            }

            // 🛡️ おりぴさんの指示: 動画（または代替画像）がない場合は投稿を作成しないらび！
            if (!imageUrl) {
                log(`[Skip] 動画または画像が見つからないためスキップらび: ${news.title}`);
                continue;
            }

            const surveyTitle = news.title.slice(0, 100);
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            // 📝 説明文を少し長めにしつつ、キリのいいところで切る魔法 🪄
            const smartTruncate = (text, limit = 600) => {
                if (!text || text.length <= limit) return text;
                const sub = text.slice(0, limit);
                // 文末（。！？）を探して、そこで切るらび！
                const lastPunct = Math.max(
                    sub.lastIndexOf('。'),
                    sub.lastIndexOf('！'),
                    sub.lastIndexOf('？'),
                    sub.lastIndexOf('?'),
                    sub.lastIndexOf('!')
                );
                return lastPunct > limit * 0.5 ? sub.slice(0, lastPunct + 1) : sub;
            };

            const truncatedDescription = smartTruncate(news.description || '', 600);

            // 📝 説明文の末尾に「[続きを読む](URL)」を挿入するらび！ (UI側で装飾されるよ)
            const finalDescription = truncatedDescription + `\n\n[続きを読む](${news.link})`;

            if (IS_DRY_RUN) {
                log(`[DRY RUN] 投稿: ${news.title} [${news.category}]`);
                count++;
                continue;
            }

            const { data: sData, error: sErr } = await supabase.from('surveys').insert([{
                title: surveyTitle,
                category: news.category,
                image_url: imageUrl,
                description: finalDescription,
                deadline: deadline.toISOString(),
                visibility: 'public',
                is_official: true,
                tags: news.tags || []
            }]).select('id');

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
