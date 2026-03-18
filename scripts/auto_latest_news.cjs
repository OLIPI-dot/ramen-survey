const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 環境変数取得
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            for (const line of lines) {
                if (line.trim().startsWith(key + '=')) {
                    return line.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

// ニュースソース設定
const RSS_SOURCES = [
    { name: 'Yahoo!トピックス(総合)', url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml', priority: 1, category: "ニュース・経済" },
    { name: 'Yahoo!エンタメ', url: 'https://news.yahoo.co.jp/rss/topics/entertainment.xml', priority: 2, category: "エンタメ" },
    { name: 'Yahoo!IT', url: 'https://news.yahoo.co.jp/rss/topics/it.xml', priority: 2, category: "IT・テクノロジー" },
    { name: 'Yahoo!サイエンス', url: 'https://news.yahoo.co.jp/rss/topics/science.xml', priority: 3, category: "IT・テクノロジー" },
    { name: 'Yahoo!国内', url: 'https://news.yahoo.co.jp/rss/topics/domestic.xml', priority: 3, category: "生活" },
    { name: 'NHK主要ニュース', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', priority: 2, category: "ニュース・経済" },
    { name: 'まとめくすアンテナ(人気)', url: 'https://feeds.mtmx.jp/news/all/popular/feed.xml', priority: 3, category: "トレンド" },
    { name: '日経新聞(速報)', url: 'https://assets.wor.jp/rss/rdf/nikkei/news.rdf', priority: 4, category: "ニュース・経済" }
];

async function fetchRSSNews() {
    console.log('📡 RSSソースからバランスよくニュースを取得中...');
    let allNews = [];

    for (const source of RSS_SOURCES) {
        try {
            const response = await axios.get(source.url);
            const xml = response.data;
            const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/g);
            if (!items) continue;

            const parsed = items.map(itemXml => {
                const titleMatch = itemXml.match(/<title>(.*?)<\/title>/);
                const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
                const descMatch = itemXml.match(/<description>(.*?)<\/description>/);
                
                const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
                const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/<[^>]*>?/gm, '').trim() : '';
                
                return {
                    title: title,
                    link: linkMatch ? linkMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '',
                    description: description,
                    source: source.name,
                    priority: source.priority,
                    category: source.category || "ニュース・経済"
                };
            }).filter(n => n.title);

            // 各ソースから上位10件まで採用
            allNews = allNews.concat(parsed.slice(0, 10));
        } catch (e) {
            console.error(`⚠️ ${source.name} の取得失敗:`, e.message);
        }
    }
    return allNews;
}

async function fetchChannelNews() {
    console.log('📡 2chまとめアンテナから勢いのある記事を取得中...');
    try {
        const response = await axios.get('https://2ch-c.net/?p=ranking', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = response.data;
        
        const htmlMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g);
        if (!htmlMatches) return [];
        
        return htmlMatches.map(m => {
            const link = m.match(/href="([^"]+)"/)?.[1] || '';
            const title = m.replace(/<[^>]*>?/gm, '').trim();
            if (!link || title.length < 15 || link.includes('2ch-c.net')) return null;
            
            // 2chまとめのタイトルからカテゴリを推測
            let category = "トレンド";
            if (title.includes('アニメ') || title.includes('マンガ') || title.includes('声優')) category = "アニメ";
            if (title.includes('ゲーム') || title.includes('Switch') || title.includes('PS5')) category = "ゲーム";
            if (title.includes('芸能') || title.includes('アイドル') || title.includes('女優')) category = "エンタメ";
            if (title.includes('食') || title.includes('料理') || title.includes('店')) category = "グルメ";

            return {
                title: title,
                link: link,
                description: `2chまとめで話題の記事らび！✨ "${title}" \n詳細はまとめサイトをチェックしてみてね！`,
                source: '2chまとめアンテナ',
                priority: 3,
                category: category
            };
        }).filter(n => n).slice(0, 15);
    } catch (e) {
        console.error('⚠️ 2chまとめアンテナの取得失敗:', e.message);
        return [];
    }
}

function getLabiGreeting() {
    const hour = (new Date(new Date().getTime() + 9 * 60 * 60 * 1000)).getUTCHours();
    if (hour >= 5 && hour < 11) return "おはようらびっ！🌅 朝の注目トピックスを届けに来たよ。";
    if (hour >= 11 && hour < 17) return "こんにちはらび！🕛 お昼休みにぴったりの話題を厳選したよ。";
    return "こんばんはらびっ！🌃 今日の締めくくりに、話題のニュースを振り返ろうらび。";
}

async function postLatestNewsSurveys() {
    const rssNews = await fetchRSSNews();
    const chNews = await fetchChannelNews();
    
    // ニュースと2chまとめを混ぜてシャッフル（偏り防止）
    let allNews = [...rssNews, ...chNews].sort(() => Math.random() - 0.5);

    if (allNews.length === 0) {
        console.error('❌ ネタが一つも見つからなかったらび……😰');
        return;
    }

    console.log(`🔍 取得数: RSS(${rssNews.length}) + 2ch(${chNews.length})。バランスよく投稿しますらび！`);

    let postedCount = 0;
    const maxPosts = 8; // 大増量！らび頑張る！🐰🔥

    for (const news of allNews) {
        if (postedCount >= maxPosts) break;

        const surveyTitle = news.source === '2chまとめアンテナ' 
            ? `【話題】${news.title} 🔥💬` 
            : `【速報/注目】${news.title} 📡📰`;

        // 重複チェック
        const { data: existing } = await supabase.from('surveys').select('id').eq('title', surveyTitle).limit(1);
        if (existing && existing.length > 0) {
            continue;
        }

        console.log(`🚀 [${news.category}] 「${surveyTitle}」を投稿します！ (${news.source})`);

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);

        // YouTube 検索
        let videoId = "News_Video_Placeholder";
        try {
            const searchQuery = encodeURIComponent(`${news.title} 公式`);
            const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
            const searchRes = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const dataMatch = searchRes.data.match(/var ytInitialData = (\{.*?\});/);
            const ytData = dataMatch ? JSON.parse(dataMatch[1]) : null;

            if (ytData && ytData.contents) {
                const contents = ytData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
                for (const item of contents) {
                    const video = item.videoRenderer;
                    if (video && video.videoId) {
                        videoId = video.videoId;
                        break;
                    }
                }
            }
        } catch (e) { console.warn('⚠️ YT検索エラー:', e.message); }

        const finalDescription = `${news.description}\n\n【参考元: ${news.source}】\n${news.link}`;

        const { data: surveyData, error: surveyError } = await supabase.from('surveys').insert([{
            title: surveyTitle,
            category: news.category || "ニュース・経済",
            tags: ["速報", "注目", news.source, "話題"],
            image_url: `yt:${videoId}`,
            deadline: deadline.toISOString(),
            visibility: 'public',
            description: finalDescription,
            is_official: true
        }]).select();

        if (surveyError) {
            console.error(`❌ 「${news.title}」の投稿失敗:`, surveyError);
            continue;
        }

        const surveyId = surveyData[0].id;
        const options = news.source === '2chまとめアンテナ' 
            ? ["わかる、共感できる！", "それはちょっと違うかな", "どびみょ〜……", "詳しく知りたい"]
            : ["非常に関心がある", "少し気になる", "今のところ静観", "詳しく調べたい"];

        await supabase.from('options').insert(
            options.map(name => ({ name, votes: 0, survey_id: surveyId }))
        );

        const greeting = getLabiGreeting();
        const comment = `${greeting}✨ 『${news.title}』を見つけてきたよ！(${news.source}) \n\nカテゴリは【${news.category}】になってるらび。みんなはどう思うかな？ 詳しい内容は解説文エリアのリンクもチェックしてみてね。らびと一緒に話そうらび！🐰🛡️🥇🏆`;

        await supabase.from('comments').insert([{
            survey_id: surveyId,
            user_name: 'らび🐰(AI)',
            content: comment,
            edit_key: 'labi_bot'
        }]);

        postedCount++;
    }

    console.log(`🏁 今回の自動投稿（計${postedCount}件）が無事に完了したらびっ！🥕✨🥇🏆`);
}

postLatestNewsSurveys();
