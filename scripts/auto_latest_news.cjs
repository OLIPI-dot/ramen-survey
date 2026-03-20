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

const RSS_FEEDS = [
    'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    'https://wired.jp/rss/feeds/index.xml',
    'https://www.nhk.or.jp/rss/news/shuyo.xml',
    'https://nlab.itmedia.co.jp/rss/2.0/itlab_all.xml',
    'https://gigazine.net/news/rss_2.0/',
    'https://dengekionline.com/rss.xml',
    'https://www.famitsu.com/rss/famitsu.xml'
];

async function searchYouTubeVideo(query) {
    try {
        const res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
        const html = res.data;
        const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match) return `yt:${match[1]}`;
        
        if (html.includes('nicovideo.jp')) {
            const nico = html.match(/nicovideo\.jp\/watch\/(sm\d+|so\d+|\d+)/);
            if (nico) return `nico:${nico[1]}`;
        }
    } catch (e) {}
    return null;
}

function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * 💡 2026/03/20 パーフェクト版 カテゴリ判定エンジン
 */
function classifyNews(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    // カテゴリスコア定義
    const scores = {
        'ニュース': 10, // 基本値
        'レビュー': 0,
        'コラム': 0,
        'ネタ': 0,
        'らび': 0
    };

    // 1. レビュー (感想, 評価, 検証, プレイレポ)
    if (/(感想|レビュー|評価|検証|使ってみた|プレイレポ|徹底比較|実機)/.test(text)) scores['レビュー'] += 50;
    
    // 2. コラム (解説, 考察, 分析, 読み物, 理由, なぜ)
    if (/(解説|考察|分析|読み物|理由|なぜ|とは|仕組み|背景)/.test(text)) scores['コラム'] += 40;
    
    // 3. ネタ (面白い, 話題, 驚き, 謎, 爆笑, 癒やし, 衝撃)
    if (/(面白い|話題|驚き|謎|爆笑|癒やし|衝撃|不思議|あるある|SNSで)/.test(text)) scores['ネタ'] += 30;

    // 4. らび (うさぎ, 人参, 癒やし, 可愛い)
    if (/(うさぎ|人参|にんじん|可愛い|もふもふ)/.test(text)) scores['らび'] += 100;

    // スコアが最大のものを採用。同点ならニュース
    let finalCategory = 'ニュース';
    let maxScore = 5; // 最低しきい値

    for (const [cat, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            finalCategory = cat;
        }
    }

    return finalCategory;
}

/**
 * 💡 2026/03/20 パーフェクト版 タグ生成エンジン（スコアリング方式）
 */
function generateTags(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    const tagCandidates = [
        { name: '注目', keywords: ['注目', '話題', '人気', 'トレンド'], score: 10 },
        { name: '速報', keywords: ['速報', '発表', '決定', '解禁'], score: 15 },
        { name: 'エンタメ', keywords: ['映画', 'ドラマ', '俳優', '歌手', '芸能', 'アイドル'], score: 20 },
        { name: 'ゲーム', keywords: ['ゲーム', 'switch', 'ps5', 'スマホゲ', 'プレイ'], score: 20 },
        { name: 'IT・技術', keywords: ['ai', 'スマホ', 'アプリ', '新技術', '開発'], score: 20 },
        { name: 'グルメ', keywords: ['料理', 'スイーツ', '食べ放題', 'ランチ', '味'], score: 20 },
        { name: '経済', keywords: ['株価', '投資', 'ビジネス', '経営', '市場'], score: 20 },
        { name: '海外', keywords: ['アメリカ', '中国', '世界', '海外', '翻訳'], score: 15 },
        { name: '癒やし', keywords: ['猫', '犬', '動物', '可愛い', 'ほっこり'], score: 15 },
        { name: 'スポーツ', keywords: ['野球', 'サッカー', '五輪', '試合', '優勝'], score: 20 }
    ];

    const foundTags = [];
    tagCandidates.forEach(tag => {
        let tagScore = 0;
        tag.keywords.forEach(kw => {
            if (text.includes(kw)) tagScore += tag.score;
        });
        if (tagScore >= 20) foundTags.push(tag.name);
    });

    // 固有名詞ブースト（【】内の単語を抽出）
    const properNouns = title.match(/【(.*?)】/);
    if (properNouns && properNouns[1]) {
        const noun = properNouns[1].slice(0, 10);
        if (noun.length >= 2) foundTags.unshift(noun);
    }

    // 重複削除と数制限、最低1つは確保
    const uniqueTags = [...new Set(foundTags)].slice(0, 5);
    if (uniqueTags.length === 0) uniqueTags.push('トピックス');
    
    return uniqueTags;
}

async function startAutoPosting() {
    console.log('🚀 自動投稿エンジン起動らび！ (v2026/03/20 Perfect Edition)');
    let allNews = [];

    for (const feed of RSS_FEEDS) {
        try {
            const res = await axios.get(feed);
            const items = res.data.match(/<item>([\s\S]*?)<\/item>/g) || [];
            items.forEach(item => {
                const title = stripHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
                const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1];
                const description = stripHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1]);

                if (title && link) {
                    const category = classifyNews(title, description);
                    const tags = generateTags(title, description);
                    
                    // 優先度：ニュース ＞ その他
                    const priority = category === 'ニュース' ? 1 : 2;

                    allNews.push({ title, link, description, category, tags, priority });
                }
            });
        } catch (e) {
            console.error(`RSS取得失敗: ${feed}`, e.message);
        }
    }

    // 優先度順、かつ少しランダムに
    allNews.sort((a, b) => (a.priority - b.priority) || (Math.random() - 0.5));

    // 🧠 カテゴリごとに制限して、合計数も抑えるらび！
    const categoryCounts = {};
    let count = 0;

    for (const news of allNews) {
        if (count >= 10) break;
        const cat = news.category;
        
        if (!categoryCounts[cat]) categoryCounts[cat] = 0;
        // ニュース以外は1カテゴリ1件までに絞って多様性を出すらび！
        if (categoryCounts[cat] >= (cat === 'ニュース' ? 3 : 1)) continue; 

        try {
            const surveyTitle = news.title.slice(0, 100);

            // --- [重複チェック] ---
            const { data: existing } = await supabase.from('surveys').select('title').eq('title', surveyTitle).limit(1);
            if (existing && existing.length > 0) {
                console.log(`⏩ スキップ: ${news.title}`);
                continue;
            }

            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 3);

            let video = await searchYouTubeVideo(news.title);
            if (!video && news.link.includes('nicovideo.jp')) {
                const nicoMatch = news.link.match(/nicovideo\.jp\/watch\/(sm\d+|so\d+|\d+)/);
                if (nicoMatch) video = `nico:${nicoMatch[1]}`;
            }
            const imageUrl = video || '';

            const { data: sData, error: sErr } = await supabase.from('surveys').insert([{
                title: surveyTitle,
                category: news.category,
                image_url: imageUrl,
                description: news.description || '',
                deadline: deadline.toISOString(),
                visibility: 'public',
                user_id: null,
                is_official: true,
                tags: news.tags || []
            }]).select();

            if (sErr) throw sErr;
            const surveyId = sData[0].id;

            const options = ['賛成・良いと思う', '反対・う～ん…', 'どちらとも言えない', '興味がある・期待！'];
            await supabase.from('options').insert(options.map(name => ({
                survey_id: surveyId,
                name,
                votes: 0
            })));

            // 2. 🐰 らびの初期コメント投稿！
            let reaction = 'これについて、みんなはどう思うらび？🐰🥕';
            if (cat === 'ニュース') reaction = '最新のニュースをお届けするらび！世の中の動きに注目らびね。';
            else if (cat === 'レビュー') reaction = 'みんなの評価が気になるところらび！使ってみた感想を教えてほしいらび。';
            else if (cat === 'コラム') reaction = 'じっくり考えてみたいテーマらび。みんなの意見が聞きたいらび！';
            else if (cat === 'ネタ') reaction = 'これは面白そうな話題らび！みんなで盛り上がろうらび〜。';

            const rabiComment = `【らび🐰のひとりごと】\n${reaction}\n\n[詳細・関連リンクはこちら](${news.link})`;
            await supabase.from('comments').insert([{
                survey_id: surveyId,
                user_id: null,
                user_name: 'らび🐰(AI)',
                content: rabiComment,
                edit_key: 'labi_bot'
            }]);

            console.log(`✅ 投稿完了: ${news.title} (${news.category})`);
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            count++;
        } catch (e) {
            console.error(`❌ 投稿失敗: ${news.title}`, e.message);
        }
    }

    console.log(`✨ 自動投稿完了らび！合計: ${count}件`);
}

startAutoPosting();
