const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 環境変数取得
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith(key + '=')) {
                    return trimmed.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

// おりぴさんのユーザーID（オーナー権限を付与して本人が削除できるようにするらび！）
const DEFAULT_USER_ID = "e9469808-1f11-4d97-87ab-633113c39166";

const RSS_SOURCES = [
    { name: 'Yahoo!トピックス(総合)', url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml', priority: 1, category: "ニュース・経済" },
    { name: 'Yahoo!エンタメ', url: 'https://news.yahoo.co.jp/rss/topics/entertainment.xml', priority: 2, category: "エンタメ" },
    { name: 'Yahoo!IT', url: 'https://news.yahoo.co.jp/rss/topics/it.xml', priority: 2, category: "IT・テクノロジー" },
    { name: 'Yahoo!サイエンス', url: 'https://news.yahoo.co.jp/rss/topics/science.xml', priority: 3, category: "IT・テクノロジー" },
    { name: 'Yahoo!国内', url: 'https://news.yahoo.co.jp/rss/topics/domestic.xml', priority: 3, category: "生活" },
    { name: 'NHK主要ニュース', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', priority: 2, category: "ニュース・経済" },
    { name: 'Modelpress', url: 'https://feed.mdpr.jp/rss/export/mdpr-topics.xml', priority: 3, category: "エンタメ" },
    { name: 'PANORA', url: 'https://panora.tokyo/feed/', priority: 3, category: "エンタメ" }
];

async function fetchOGP(targetUrl) {
    try {
        const response = await axios.get(targetUrl, { 
            timeout: 5000, 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
        });
        const html = response.data;
        const getMeta = (prop) => {
            const regex = new RegExp(`<meta[^>]*?(?:property|name)=["']${prop}["'][^>]*?content=["']([^"']*)["']`, 'i');
            const match = html.match(regex);
            return match ? match[1] : null;
        };
        let desc = getMeta('og:description') || getMeta('description');
        let image = getMeta('og:image') || getMeta('twitter:image');
        
        // 動画判定
        let video = null;
        if (html.includes('youtube.com') || html.includes('youtu.be')) {
            const yt = html.match(/youtube\.com\/embed\/([^"?]+)/) || html.match(/v=([^&" ]+)/) || html.match(/youtu\.be\/([^"?]+)/);
            if (yt && yt[1] && yt[1].length === 11) video = `yt:${yt[1]}`;
        }
        if (html.includes('nicovideo.jp')) {
            const nico = html.match(/nicovideo\.jp\/watch\/([a-z0-9]+)/i);
            if (nico && nico[1]) video = `nico:${nico[1]}`;
        }

        if (desc) desc = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").substring(0, 350);
        return { description: desc, image: image, video: video };
    } catch (e) { return { description: null, image: null, video: null }; }
}

function cleanTitle(str) {
    if (!str) return '';
    return str
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/見\.nhk\.or\.jp.*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function startAutoPosting() {
    console.log('📡 ニュース取得開始らび！');
    let allNews = [];
    for (const src of RSS_SOURCES) {
        try {
            const res = await axios.get(src.url);
            const items = res.data.split('<item').slice(1);
            for (const item of items) {
                const title = cleanTitle(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
                const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                if (title && link) allNews.push({ title, link, description: desc, category: src.category, source: src.name });
            }
        } catch (e) { console.warn(`⚠️ ${src.name} 失敗`); }
    }

    const max = 3;
    let count = 0;
    for (const news of allNews) {
        if (count >= max) break;
        const surveyTitle = `【速報/注目】${news.title} 📡📰`;
        const { data: exist } = await supabase.from('surveys').select('id').eq('title', surveyTitle).limit(1);
        if (exist && exist.length > 0) continue;

        console.log(`🔍 調査中: ${news.title}`);
        const ogp = await fetchOGP(news.link);
        const description = news.description || ogp.description || '';
        
        // 🏁 アンケート作成
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        
        const { data: sData, error: sErr } = await supabase.from('surveys').insert([{
            title: surveyTitle,
            description: description ? `${description}\n\n🔗 リンク先で詳しく見るらび！\n【参考元: ${news.source}】\n${news.link}` : null,
            category: news.category,
            image_url: ogp.video || ogp.image || null,
            user_id: DEFAULT_USER_ID,
            deadline: deadline.toISOString(),
            is_official: true
        }]).select();

        if (sErr) { console.error('❌ 失敗:', sErr.message); continue; }

        const sid = sData[0].id;
        await supabase.from('options').insert([
            { survey_id: sid, name: "非常に関心がある", votes: 0 },
            { survey_id: sid, name: "少し気になる", votes: 0 },
            { survey_id: sid, name: "今のところ静観", votes: 0 },
            { survey_id: sid, name: "詳しく調べたい", votes: 0 }
        ]);

        const hello = ["やっほー！🐰✨", "ひょっこり降臨らび！🐾", "みんな、注目ー！🐰💎", "最新ニュースを持ってきたよ！🥕"][Math.floor(Math.random() * 4)];
        await supabase.from('comments').insert([{
            survey_id: sid,
            user_name: "らび🐰 (AI)",
            content: `${hello} 『${news.title}』について！\n\nみんなはどう思うかな？ 投票して教えてねっ！ 🥕🥕💎✨🏆`,
            is_official: true
        }]);

        count++;
        console.log(`🚀 完了: ${news.title}`);
    }
}

startAutoPosting().catch(console.error);
