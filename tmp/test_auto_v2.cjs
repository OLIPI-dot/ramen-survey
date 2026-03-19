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

// おりぴさんのユーザーID（オーナーとして登録することで削除可能にするらび！）
const DEFAULT_OWNER_ID = "e9469808-1f11-4d97-87ab-633113c39166";

// ニュースソース設定
const RSS_SOURCES = [
    { name: 'Yahoo!トピックス(総合)', url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml', priority: 1, category: "ニュース・経済" },
    { name: 'Yahoo!エンタメ', url: 'https://news.yahoo.co.jp/rss/topics/entertainment.xml', priority: 2, category: "エンタメ" },
    { name: 'Yahoo!IT', url: 'https://news.yahoo.co.jp/rss/topics/it.xml', priority: 2, category: "IT・テクノロジー" },
    { name: 'Yahoo!サイエンス', url: 'https://news.yahoo.co.jp/rss/topics/science.xml', priority: 3, category: "IT・テクノロジー" },
    { name: 'Yahoo!国内', url: 'https://news.yahoo.co.jp/rss/topics/domestic.xml', priority: 3, category: "生活" },
    { name: 'NHK主要ニュース', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', priority: 2, category: "ニュース・経済" },
    { name: 'Modelpress', url: 'https://feed.mdpr.jp/rss/export/mdpr-topics.xml', priority: 3, category: "エンタメ" },
    { name: 'LogTube(YouTuber)', url: 'https://logtube.jp/feed/', priority: 3, category: "エンタメ" },
    { name: 'PANORA(VTuber)', url: 'https://panora.tokyo/feed/', priority: 3, category: "エンタメ" },
    { name: 'まとめくすアンテナ(人気)', url: 'https://feeds.mtmx.jp/news/all/popular/feed.xml', priority: 3, category: "トレンド" }
];

// OGP情報・画像を取得する魔法
async function fetchOGPInfo(targetUrl) {
    try {
        const response = await axios.get(targetUrl, { 
            timeout: 5000, 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
        });
        const html = response.data;
        
        // 厳格な正規表現による抽出
        const getMeta = (prop) => {
            const regex = new RegExp(`<meta[^>]*?(?:property|name)=["']${prop}["'][^>]*?content=["']([^"']*)["']`, 'i');
            const match = html.match(regex);
            if (match) return match[1];
            
            const regexAlt = new RegExp(`<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${prop}["']`, 'i');
            const matchAlt = html.match(regexAlt);
            return matchAlt ? matchAlt[1] : null;
        };

        let desc = getMeta('og:description') || getMeta('description');
        let image = getMeta('og:image') || getMeta('twitter:image');

        // 動画IDの抽出
        let videoStr = null;
        const ytMatch = html.match(/youtube\.com\/embed\/([^"?]+)/) || html.match(/v=([^&" ]+)/) || html.match(/youtu\.be\/([^"?]+)/);
        if (ytMatch && ytMatch[1] && ytMatch[1].length === 11) videoStr = `yt:${ytMatch[1]}`;
        
        const nicoMatch = html.match(/nicovideo\.jp\/watch\/([a-z0-9]+)/i);
        if (nicoMatch && nicoMatch[1]) videoStr = `nico:${nicoMatch[1]}`;

        // 本文からのフォールバック抽出
        if (!desc || desc.length < 30) {
            const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
            if (pMatch) {
                const text = pMatch[1].replace(/<[^>]*>?/gm, '').trim();
                if (text.length > 50) desc = text;
            }
        }

        if (desc) {
            desc = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
            desc = desc.substring(0, 400); 
        }

        return { description: desc, image: image, video: videoStr };
    } catch (e) {
        return { description: null, image: null, video: null };
    }
}

function cleanTitle(title) {
    if (!title) return '';
    // URLや不要な記号、末尾のゴミを徹底排除
    let clean = title
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/見\.nhk\.or\.jp.*/g, '') // NHK特有のゴミ
        .replace(/\s+/g, ' ')
        .trim();
    
    // CDATAなどの残党を削除
    clean = clean.replace(/<!\[CDATA\[|\]\]>/g, '');
    
    // 100文字以上に切り詰め
    if (clean.length > 100) clean = clean.substring(0, 100) + '...';
    return clean;
}

async function fetchRSSNews() {
    console.log('📡 RSSソースから取得中...');
    let allNews = [];

    for (const source of RSS_SOURCES) {
        try {
            const response = await axios.get(source.url);
            const xml = response.data;
            
            // アイテムごとに分割して解析（正規表現の暴走を防ぐらび！）
            const itemChunks = xml.split('<item');
            for (let i = 1; i < itemChunks.length; i++) {
                const item = itemChunks[i].split('</item>')[0];
                
                const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
                const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
                const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);

                if (!titleMatch || !linkMatch) continue;

                let title = cleanTitle(titleMatch[1]);
                let link = linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                let description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

                if (!title || !link || title.includes('PR:')) continue;

                allNews.push({
                    title: title,
                    link: link,
                    description: description,
                    source: source.name,
                    priority: source.priority,
                    category: source.category
                });
            }
        } catch (e) {
            console.warn(`⚠️ ${source.name} 取得失敗:`, e.message);
        }
    }
    return allNews;
}

function getLabiCommentary(category, title, description) {
    // カテゴリ別の基本メッセージ
    const base = {
        "エンタメ": "芸能界やトレンドの話題、らびもワクワクしちゃう！✨ みんなはどう思うかな？",
        "グルメ": "おいしそうな話題！人参も負けてられないらびっ🥕😋 食べに行きたくなっちゃうね！",
        "IT・テクノロジー": "最新の技術ってすごーい！未来を感じる話題らびね💻✨",
        "生活": "暮らしに役立つ大切なニュースらび！みんなでチェックしておこう🏠🛡️",
        "ニュース・経済": "世の中の大事な動きだね。しっかり見守っていきたいらび📈🗞️",
        "音楽": "素敵な音楽の話題！らびも一緒にリズムに乗りたくなっちゃうらび🎵🐇",
        "トレンド": "今まさに盛り上がってる話題らび！🔥 みんなの意見、聞かせてねっ！"
    };

    const greeting = ["やっほー！🐰✨", "ひょっこり降臨らび！🐾", "みんな、注目ー！🐰💎", "最新ニュースを持ってきたよ！🥕"][Math.floor(Math.random() * 4)];
    const impression = base[category] || "これ、すっごく気になる話題らび！👀 みんなで話そう！✨";
    
    return `${greeting} 『${title}』について！\n\n${impression}\n\n詳しい内容は解説文エリアのリンクもチェックしてみてね。らびと一緒に話そう！🐰🛡🥇🏆`;
}

async function postLatestNewsSurveys() {
    const allNewsRaw = await fetchRSSNews();
    
    // シャッフルして優先度順に
    let allNews = allNewsRaw.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return Math.random() - 0.5;
    });

    if (allNews.length === 0) {
        console.error('❌ ネタが見つからなかったらび……😰');
        return;
    }

    const maxPosts = 3; // 慎重に3件ずつ
    let postedCount = 0;

    for (const news of allNews) {
        if (postedCount >= maxPosts) break;

        const surveyTitle = `【速報/注目】${news.title} 📡📰`;

        // 重複チェック
        const { data: existing } = await supabase.from('surveys').select('id').eq('title', surveyTitle).limit(1);
        if (existing && existing.length > 0) continue;

        console.log(`🔍 調査中: ${news.title}`);
        const ogp = await fetchOGPInfo(news.link);
        
        let finalDesc = news.description || ogp.description || '';
        if (finalDesc.length > 300) finalDesc = finalDesc.substring(0, 300) + '...';

        // 詳細な解説文を構築
        const fullDescription = `📰 **ニュースの概要**\n${finalDesc || '（詳細はリンク先をチェックしてください）'}\n\n🔗 **詳しく見る（外部サイト）**\n【参考元: ${news.source}】\n${news.link}`;

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);

        const record = {
            title: surveyTitle,
            description: fullDescription,
            category: news.category,
            user_id: DEFAULT_OWNER_ID, // おりぴさんにオーナー権限を付与！
            image_url: ogp.video || ogp.image || null,
            deadline: deadline.toISOString(),
            is_official: true
        };

        if (dryRun) {
            console.log(`🧪 [DRY-RUN]`);
            console.log(JSON.stringify(record, null, 2));
        } else {
            const { data: sData, error: sErr } = await supabase.from('surveys').insert([record]).select();
            if (sErr) {
                console.error('❌ 投稿失敗:', sErr.message);
                continue;
            }

            const surveyId = sData[0].id;
            // 選択肢
            await supabase.from('options').insert([
                { survey_id: surveyId, name: "非常に関心がある", votes: 0 },
                { survey_id: surveyId, name: "少し気になる", votes: 0 },
                { survey_id: surveyId, name: "今のところ静観", votes: 0 },
                { survey_id: surveyId, name: "詳しく調べたい", votes: 0 }
            ]);

            // らびのコメント
            const comment = getLabiCommentary(news.category, news.title, finalDesc);
            await supabase.from('comments').insert([{
                survey_id: surveyId,
                user_name: "らび🐰 (AI)",
                content: comment,
                is_official: true
            }]);
        }

        postedCount++;
        console.log(`🚀 [${news.category}] 「${news.title}」を投稿しました！`);
    }
}

const dryRun = process.argv.includes('--dry-run');
postLatestNewsSurveys().catch(console.error);
