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
    { name: 'まとめくすアンテナ(人気)', url: 'https://feeds.mtmx.jp/news/all/popular/feed.xml', priority: 3, category: "トレンド" },
    { name: '日経新聞(速報)', url: 'https://assets.wor.jp/rss/rdf/nikkei/news.rdf', priority: 4, category: "ニュース・経済" }
];

// OGP情報または本文の冒頭を取得する魔法 🪄
async function fetchOGPDescription(targetUrl) {
    try {
        const response = await axios.get(targetUrl, { 
            timeout: 5000, 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
        });
        const html = response.data;
        // og:description または description を抽出
        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) || 
                           html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        
        let desc = (ogDescMatch ? ogDescMatch[1] : (descMatch ? descMatch[1] : null));
        
        // metaタグが短い、または取得できない場合は本文から抽出を試みる 🕵️‍♂️
        if (!desc || desc.length < 40) {
            // シンプルな正規表現で最初の長めの<p>タグを探す
            const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
            if (pMatches) {
                for (const p of pMatches) {
                    const text = p.replace(/<[^>]*>?/gm, '').trim();
                    // 100文字以上あればリード文として採用候補
                    if (text.length > 100 && !text.includes('JavaScript') && !text.includes('ブラウザ')) {
                        desc = text;
                        break;
                    }
                }
            }
        }

        if (desc) {
            // HTML実体参照などをデコード（簡易）
            desc = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
            
            // 不要なボイラープレートをフィルタリング
            const boilerplates = [
                "JavaScript is disabled", "JavaScriptを有効にしてください", "お使いのブラウザは", "Loading...",
                "Wait a moment", "リダイレクト中", "ログインして", "利用規約に同意"
            ];
            if (boilerplates.some(b => desc.includes(b))) return null;
            
            // 著作権と読みやすさを考慮して300文字程度に制限 ✂️
            if (desc.length > 300) {
                desc = desc.substring(0, 300) + '...';
            }
        }
        return desc;
    } catch (e) {
        return null;
    }
}

async function fetchRSSNews() {
    console.log('📡 RSSソースからバランスよくニュースを取得中...');
    let allNews = [];

    for (const source of RSS_SOURCES) {
        try {
            const response = await axios.get(source.url);
            const xml = response.data;
            const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/g);
            if (!items) continue;

            const newsInSource = items.map(item => {
                const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
                const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
                const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
                
                if (!title || !link) return null;

                return {
                    title: title.trim(),
                    link: link.trim(),
                    description: description.trim(),
                    source: source.name,
                    priority: source.priority,
                    category: source.category
                };
            }).filter(n => n);

            allNews = [...allNews, ...newsInSource];
        } catch (e) {
            console.warn(`⚠️ ${source.name} の取得失敗:`, e.message);
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
            
            let category = "トレンド";
            if (title.includes('アニメ') || title.includes('マンガ') || title.includes('声優')) category = "アニメ";
            if (title.includes('ゲーム') || title.includes('Switch') || title.includes('PS5')) category = "ゲーム";
            if (title.includes('芸能') || title.includes('アイドル') || title.includes('女優')) category = "エンタメ";
            if (title.includes('食') || title.includes('料理') || title.includes('店')) category = "グルメ";

            return {
                title: title,
                link: link,
                description: null, 
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
    return "やっほー！🐰✨";
}

function getLabiImpression(category, title) {
    const impressions = {
        "エンタメ": ["最近のトレンドは目が離せないらび！✨", "芸能界のニュース、ワクワクしちゃうねっ！🌈", "これ、らびも気になってたんだ！🎬"],
        "グルメ": ["おいしそうな話題……人参も負けてられないらび！🥕🍰", "これ食べたら元気になれそうだねっ！😋", "グルメ情報はいつも楽しみらび！🍔"],
        "スポーツ": ["スポーツの熱気、らびにも伝わってきたよ！⚽🔥", "一生懸命な姿って、見ているだけで感動しちゃうねっ！🏆", "みんなで応援しようらび！📣"],
        "IT・テクノロジー": ["最新技術ってすごーい！未来が楽しみらび！💻✨", "便利な世の中になっていくねっ！🚀", "これからの進化に期待らび！🤖"],
        "アニメ": ["アニメ界の盛り上がり、らびも大好きらび！📺✨", "声優さんや制作さんの情熱がすごいねっ！🔥", "次の話が楽しみすぎるらび……！🌟"],
        "ゲーム": ["ゲーム의話題はいつも胸が熱くなるねっ！🎮✨", "みんなで遊んだら楽しそうらび！🕹️", "新作情報、らびもチェックしなきゃ！🌟"],
        "生活": ["毎日の生活に役立ちそうな情報だねっ！🏠✨", "これを知っておくと便利そうらび！💡", "平和な日常が一番らびね〜🍀"],
        "トレンド": ["今まさに話題のトピックスだねっ！🔥✨", "みんなの関心が高そうなお話らび！👀", "これが今キテるんだねっ！🌈"],
        "ニュース・経済": ["世の中の動きをしっかりチェックらび！📉🗞️", "これからの動きが気になる重大ニュースだね……！🤔", "みんなにとって大切な情報かもしれないらび！🛡️"]
    };

    if (title.includes('結婚') || title.includes('熱愛') || title.includes('交際')) return "わぁっ！おめでたい話題らびねっ！💕 心が温まるニュースらび〜💍";
    if (title.includes('引退') || title.includes('最後') || title.includes('卒業')) return "えぇっ、寂しくなっちゃうね……😢 でも、これまでの活躍に心から拍手らびっ！✨";
    if (title.includes('優勝') || title.includes('金メダル') || title.includes('世界一')) return "やったぁぁ！おめでとうらびーっ！🎊🥇 最高の瞬間を一緒に祝おうらび！🚩";
    if (title.includes('事件') || title.includes('逮捕') || title.includes('速報')) return "これは大変なニュースらび……！みんな、最新の情報をしっかり確認しようね。🗞️⚠️";
    if (title.includes('コラボ') || title.includes('期間限定')) return "コラボレーションってワクワクするらびっ！✨ 今しか見られない特別感、たまらないね🌈";
    if (title.includes('フリーレン') || title.includes('推しの子') || title.includes('アニメ')) return "大人気のアニメの話題らび！📺✨ らびもアニメの世界に飛び込みたくなっちゃう！";

    const choices = impressions[category] || ["これ、すっごく気になる話題らび！👀", "みんなはどう思ってるかな？ワクワクするよ！✨", "らびと一緒に最新情報をチェックしようらび！🔍"];
    return choices[Math.floor(Math.random() * choices.length)];
}

function getRabiPoint(category, title) {
    const points = {
        "エンタメ": ["最新のトレンド情報らび！", "みんなの反応が気になるねっ！", "話題沸騰中のエピソードらび！"],
        "グルメ": ["おいしそうな情報にらびもお腹が空いちゃうっ！🥕", "これは要チェックなグルメスポットらびね！", "食欲をそそる素敵な話題らび！"],
        "スポーツ": ["熱い戦いから目が離せないらび！⚽", "感動の瞬間をみんなで共有しようらび！", "次なる展開が楽しみなスポーツニュースらび！"],
        "IT・テクノロジー": ["最先端のテクノロジーにワクワクするらび！💻", "私たちの生活を変えるかもしれない大注目ニュースらび！", "驚きの最新情報を見逃さないでらび！"],
        "ニュース・経済": ["世の中の動きをしっかり把握しようらび！", "これからどうなるか大注目のトピックスらびね。", "みんなで考えるべき大切なニュースらび。"]
    };

    if (title.includes('コラボ')) return "限定コラボの見逃せないポイントをチェックらび！✨";
    if (title.includes('開始') || title.includes('オープン')) return "いよいよ始まる新サービス・新店舗に大注目らび！🚀";
    if (title.includes('ランキング') || title.includes('1位')) return "みんなが選んだ「頂点」の理由を探ってみようらび！🏆";
    if (title.includes('新作') || title.includes('発売')) return "待望の新作リリース！いち早く情報をゲットらび！🎮";
    if (title.includes('悲報') || title.includes('残念')) return "ちょっと切ないニュース……みんなで寄り添おうらび。😢";

    const choices = points[category] || ["らびのおすすめ注目トピックスらび！✨", "今知っておきたい話題をお届けするよっ！"];
    return choices[Math.floor(Math.random() * choices.length)];
}

function getRabiOpinion(category, title) {
    if (title.includes('結婚') || title.includes('熱愛')) return "幸せなニュースを聞くと、らびまでハッピーな気分になっちゃうらびっ！💕";
    if (title.includes('引退') || title.includes('卒業')) return "寂しいけれど、新しい門出を全力で応援したいらびっ！✨";
    if (title.includes('優勝') || title.includes('勝利')) return "努力が実を結ぶ瞬間って、本当に最高らびね……！号泣らびっ！😭🚩";
    if (title.includes('コラボ')) return "どんな特別な体験ができるのか、今からワクワクが止まらないらびっ！🌈";
    if (title.includes('ランキング')) return "自分の予想と合ってるかな？みんなの意見も詳しく聞きたいらびっ！👀";
    if (title.includes('値上げ') || title.includes('高い')) return "お財布事情は切実らびね……人参代も上がっちゃうのかな？🥕💦";
    if (title.includes('事件') || title.includes('事故')) return "一日も早く、みんなが安心して過ごせるようになるといいらびね。🛡️";

    const generics = [
        "これ、今日一番の注目トピックスかもしれないらびっ！✨",
        "らびもこのニュースの続きがとっても気になるよっ！🔍",
        "みんなの投票結果を見て、また色々お話ししたいらび〜！🐰🌈"
    ];
    return generics[Math.floor(Math.random() * generics.length)];
}

async function postLatestNewsSurveys() {
    const rssNews = await fetchRSSNews();
    const chNews = await fetchChannelNews();
    
    // 優先度(Priority)に基づいた重み付けソート ⚖️
    let allNews = [...rssNews, ...chNews].sort((a, b) => {
        // 基本は優先度（数値が小さいほど高評価）
        if (a.priority !== b.priority) return a.priority - b.priority;
        // 同じ優先度ならランダム
        return Math.random() - 0.5;
    });

    if (allNews.length === 0) {
        console.error('❌ ネタが一つも見つからなかったらび……😰');
        return;
    }

    console.log(`🔍 取得数: RSS(${rssNews.length}) + 2ch(${chNews.length})。バランスよく投稿しますらび！`);

    let postedCount = 0;
    const maxPosts = 5;

    for (const news of allNews) {
        if (postedCount >= maxPosts) break;

        const surveyTitle = news.source === '2chまとめアンテナ' 
            ? `【話題】${news.title} 🔥💬` 
            : `【速報/注目】${news.title} 📡📰`;

        // 重複チェック
        const { data: existing } = await supabase.from('surveys').select('id').eq('title', surveyTitle).limit(1);
        if (existing && existing.length > 0) continue;

        let newsDescription = news.description;

        // 内容が薄すぎる場合はOGP取得を試みる 🔍
        if (!newsDescription || newsDescription.length < 20 || newsDescription.includes('詳細はリンク先をチェック')) {
            console.log(`🔍 内容が薄いためOGP取得を試みます: ${news.title}`);
            const ogpDesc = await fetchOGPDescription(news.link);
            if (ogpDesc && ogpDesc.length > 20) {
                newsDescription = ogpDesc;
                console.log('✅ OGPから詳細を取得したらび！');
            }
        }

        // それでも内容がない場合はスキップ
        if (!newsDescription || newsDescription.length < 15) {
            console.log(`⏩ 内容が不十分なためスキップします: ${news.title}`);
            continue;
        }

        const greeting = getLabiGreeting();
        const impression = getLabiImpression(news.category, news.title);

        const videoId = null; // YouTube検索は重いので一旦スキップか、必要に応じて追加
        
        const rabiPoint = getRabiPoint(news.category, news.title);
        const rabiOpinion = getRabiOpinion(news.category, news.title);

        const finalDescription = `📰 **ニュースの概要**\n${newsDescription}\n\n✨ **らびの注目ポイント！**\n・${rabiPoint}\n\n🐰 **らびのひとこと感想**\n${rabiOpinion}\n\n🔗 **詳しく見る（外部サイト）**\n【参考元: ${news.source}】\n${news.link}`;

        if (dryRun) {
            console.log(`🧪 [DRY-RUN] アンケート作成をスキップします: ${surveyTitle}`);
            console.log(`📝 説明文プレビュー:\n${finalDescription.substring(0, 100)}...`);
        } else {
            const { data: surveyData, error: surveyError } = await supabase.from('surveys').insert([{
                title: surveyTitle,
                description: finalDescription,
                category: news.category,
                options: ["非常に関心がある", "ある程度関心がある", "あまり関心がない", "全く関心がない"],
                image_url: null,
                created_at: new Date().toISOString()
            }]).select();

            if (surveyError) {
                console.error('❌ アンケート作成失敗:', surveyError.message);
                continue;
            }

            const surveyId = surveyData[0].id;
            const comment = `${greeting} 『${news.title}』(${news.source}) \n\n${impression} みんなはどう思うかな？ 詳しい内容は解説文エリアのリンクもチェックしてみてね。らびと一緒に話そうらび！ 🐰🛡🥇🏆`;

            await supabase.from('comments').insert([{
                survey_id: surveyId,
                user_name: "らび🐰 (AI)",
                content: comment,
                created_at: new Date().toISOString()
            }]);
        }

        console.log(`🚀 [${news.category}] 「${surveyTitle}」 を投稿しました！`);
        postedCount++;
    }

    console.log(`🏁 今回の自動投稿（計${postedCount}件）が無事に完了したらびっ！🥕✨🥇🏆`);
}

const dryRun = process.argv.includes('--dry-run');
if (dryRun) console.log('🧪 ドライラン（検証モード）で実行しますらび！');

postLatestNewsSurveys().catch(console.error);
