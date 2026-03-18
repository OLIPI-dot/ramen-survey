const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (key) => {
    const files = ['.env.local', '.env'];
    for (const f of files) {
        if (fs.existsSync(f)) {
            const content = fs.readFileSync(f, 'utf8');
            const match = content.split('\n').find(line => line.startsWith(`${key}=`));
            if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
        }
    }
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

async function postWasaBeefSurvey() {
    console.log('📡 ニュース「わさビーフ 操業停止」のアンケートを作成しますらび！');

    const topic = {
        title: "【衝撃】ホルムズ海峡封鎖で『わさビーフ』が操業停止！？国際情勢の影響、どう思う？ 🥔🧂",
        category: "ニュース・経済",
        searchQuery: "わさビーフ ホルムズ海峡 ニュース公式",
        options: [
            "まさかお菓子にまで影響が出るとは…",
            "わさビーフが食べられなくなるのは困る！",
            "国際情勢の厳しさを身近に感じた",
            "他の製品への影響も心配",
            "買い溜めせずに再開を待つ"
        ],
        tags: ["わさビーフ", "山芳製菓", "ニュース", "国際情勢", "ホルムズ海峡"],
        description: "原材料の調達や物流への影響が懸念されているらび。お菓子ひとつにも世界情勢が関わっていることを実感するニュースだね。みんなで今後の動向を見守っていこうらび。",
        comment: "まさか大好きな『わさビーフ』にまで国際情勢の影響がくるなんて、らびもビックリらび……！😱 遠い国の出来事だと思ってたことが、自分たちの生活に繋がってるんだね。みんなは、このニュースを見てどう思ったかな？🐰🛡️"
    };

    // YouTube 検索で最適な動画を探す
    let videoId = "News_Placeholder_WasaBeef";
    try {
        console.log(`🔍 YouTube で「${topic.searchQuery}」を探しています...`);
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.searchQuery)}`;
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
                    const vTitle = video.title.runs[0].text;
                    const ngWords = ['LIVE', 'ライブ', '配信中', '生放送', '予告'];
                    if (!ngWords.some(word => vTitle.includes(word))) {
                        videoId = video.videoId;
                        console.log(`📺 最適な動画を発見！: "${vTitle}" (ID: ${videoId})`);
                        break;
                    }
                }
            }
        }
    } catch (e) {
        console.error('⚠️ YouTube 検索失敗:', e.message);
    }

    // アンケート投稿
    const { data: sv, error: svErr } = await supabase.from('surveys').insert([{
        title: topic.title,
        category: topic.category,
        image_url: `yt:${videoId}`,
        tags: topic.tags,
        description: topic.description,
        is_official: true,
        visibility: 'public',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }]).select();

    if (svErr) {
        console.error('❌ 投稿失敗:', svErr.message);
        return;
    }

    const surveyId = sv[0].id;
    console.log(`✅ 作成完了！ ID: ${surveyId}`);

    // 選択肢追加
    await supabase.from('options').insert(topic.options.map(name => ({
        survey_id: surveyId,
        name: name,
        votes: 0
    })));

    // らびのコメント
    await supabase.from('comments').insert([{
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: topic.comment,
        edit_key: 'labi_bot'
    }]);

    console.log('\n🐰✨ 投稿おわったよ！おりぴさんのおかげで面白いニュースが広場に届いたらび！🥕');
}

postWasaBeefSurvey();
