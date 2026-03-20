const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env から環境変数を手動で読み込むらび！
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RSS_SOURCES = [
    { name: 'モデルプレス', url: 'https://mdpr.jp/news/rss', category: 'エンタメ', priority: 1 },
    { name: 'NHK 芸能', url: 'https://www.nhk.or.jp/rss/news/cat5.xml', category: 'エンタメ', priority: 2 },
    { name: 'NHK 速報', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', category: 'ニュース・経済', priority: 3 }
];

async function searchYouTubeVideo(title) {
    try {
        // 検索クエリをクリーンアップ（記号などを除去して検索精度を上げる）
        const query = title.replace(/[【】\[\]()]/g, ' ').trim();
        console.log(`🔍 YouTube検索中: ${query}`);
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const res = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        const html = res.data;
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match && match[1] && match[1] !== 'videoseries') {
            return match[1];
        }
        return null;
    } catch (e) {
        console.warn(`⚠️ YouTube Search Error: ${e.message}`);
        return null;
    }
}

async function fetchOGP(targetUrl) {
    try {
        const res = await axios.get(targetUrl, { timeout: 10000 });
        const html = res.data;
        const getMeta = (prop) => {
            const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`, 'i'))
                   || html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${prop}"`, 'i'));
            return m ? m[1] : null;
        };
        let desc = getMeta('og:description') || getMeta('description') || getMeta('twitter:description');
        let image = getMeta('og:image') || getMeta('twitter:image');
        
        let video = null;
        const ytPatterns = [/youtube\.com\/embed\/([^"?\/ ]+)/, /v=([^&" ]+)/, /youtu\.be\/([^"?\/ ]+)/, /youtube\.com\/shorts\/([^"?\/ ]+)/];
        for (const p of ytPatterns) {
            const m = html.match(p);
            if (m && m[1] && m[1].length === 11 && m[1] !== 'videoseries') {
                video = `yt:${m[1]}`;
                break;
            }
        }
        if (!video && html.includes('nicovideo.jp')) {
            const nico = html.match(/nicovideo\.jp\/watch\/([a-z0-9]+)/i);
            if (nico && nico[1]) video = `nico:${nico[1]}`;
        }

        if (desc) {
            desc = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
            if (desc.length > 351) desc = desc.substring(0, 347) + '...';
        }
        return { description: desc, image: image, video: video };
    } catch (e) {
        return { description: null, image: null, video: null };
    }
}

function cleanTitle(str) {
    if (!str) return '';
    return str.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/https?:\/\/[^\s]+/g, '').replace(/は NHKニュース 詳しく読む.*/g, '').replace(/NHKニュース 詳しく読む.*/g, '').replace(/詳しく読む.*/g, '').replace(/\s+/g, ' ').trim();
}

async function startAutoPosting() {
    console.log('📡 プレミアム自動投稿開始らび！🎥🐰💎');
    let allNews = [];
    for (const src of RSS_SOURCES) {
        try {
            const res = await axios.get(src.url, { timeout: 10000 });
            const items = res.data.split('<item').slice(1);
            for (const item of items) {
                const title = cleanTitle(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
                const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                if (title && link) allNews.push({ title, link, description: desc, category: src.category, source: src.name, priority: src.priority });
            }
        } catch (e) { console.warn(`⚠️ ${src.name} 失敗: ${e.message}`); }
    }

    allNews.sort((a, b) => (a.priority - b.priority) || (Math.random() - 0.5));

    const max = 3;
    let count = 0;
    for (const news of allNews) {
        if (count >= max) break;
        try {
            const surveyTitle = `【速報/注目】${news.title} 📡📰`;
            const { data: exist } = await supabase.from('surveys').select('id').eq('title', surveyTitle).limit(1);
            if (exist && exist.length > 0) continue;

            console.log(`🔍 調査中: ${news.title}`);
            const ogp = await fetchOGP(news.link);
            
            // 動画の徹底取得ロジック
            let finalVideo = ogp.video;
            if (!finalVideo) {
                const ytId = await searchYouTubeVideo(news.title);
                if (ytId) finalVideo = `yt:${ytId}`;
            }

            // 🌟 プレミアム・ルール: 動画がないものは投稿しないらび！
            if (!finalVideo) {
                console.log(`⏩ スキップ: 動画が見つかりませんでした (Title: ${news.title})`);
                continue;
            }

            const description = (ogp.description && ogp.description.length > (news.description || '').length) ? ogp.description : (news.description || '');
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            // 動的なカテゴリ判定の強化
            let finalCategory = news.category;
            if (news.title.includes('株') || news.title.includes('円') || news.title.includes('経済') || news.title.includes('金利') || news.title.includes('原油')) {
                finalCategory = 'ニュース・経済';
            } else if (news.title.includes('アニメ') || news.title.includes('声優') || news.title.includes('漫画')) {
                finalCategory = 'アニメ';
            }

            // らびちゃんの動的コメント
            let comment = "ニュースを見つけただらび！みんなはどう思う？🥕";
            if (news.title.includes('結婚') || news.title.includes('出産') || news.title.includes('発表')) {
                comment = "おめでたいニュースだらび！🎉 みんなでお祝いしましょうらび！✨";
            } else if (news.title.includes('引退') || news.title.includes('休止') || news.title.includes('終了')) {
                comment = "ちょっと寂しいニュースだらび…😢 みんなの気持ちを聞かせてらび。";
            } else if (finalCategory === 'ニュース・経済') {
                comment = "気になる社会の動きだらび。みんなの意見を教えてほしいらび！📰";
            }

            const { data: sData, error: sErr } = await supabase.from('surveys').insert([{
                title: surveyTitle,
                description: description ? `${description}\n\n🔗 リンク先で詳しく見るらび！\n【参考元: ${news.source}】\n${news.link}` : null,
                category: finalCategory,
                image_url: ogp.image ? `${finalVideo},${ogp.image}` : finalVideo,
                user_id: DEFAULT_USER_ID,
                deadline: deadline.toISOString(),
                is_official: true
            }]).select();

            if (sErr) throw sErr;
            const surveyId = sData[0].id;

            // 選択肢投稿 (optionsテーブル)らび！
            const optionNames = ["1. 感動した・応援したい", "2. 驚いた・ショックだ", "3. もっと詳しく知りたい", "4. その他 (コメントへ！)"];
            await supabase.from('options').insert(optionNames.map(name => ({
                survey_id: surveyId,
                name: name,
                votes: 0
            })));

            // コメント投稿
            await supabase.from('comments').insert([{
                survey_id: surveyId,
                content: comment,
                user_nickname: "らび"
            }]);

            console.log(`✅ プレミアム投稿成功: ${news.title} (ID: ${surveyId})`);
            count++;
        } catch (e) { console.warn(`❌ 投稿失敗 (${news.title}):`, e.message); }
    }
}

startAutoPosting();
