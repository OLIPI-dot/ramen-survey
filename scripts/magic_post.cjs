const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function createSurvey(targetUrl, customTitle = null) {
    console.log(`✨ URLから魔法でアンケートを作成します: ${targetUrl}`);
    
    let title = customTitle;
    let videoId = "News_Video_Placeholder";
    let description = "";

    // YouTube リンクの場合
    if (targetUrl.includes('youtu.be') || targetUrl.includes('youtube.com')) {
        const match = targetUrl.match(/(?:youtu\.be\/|v=)([^&?]+)/);
        if (match) videoId = match[1];
        title = title || "【話題】YouTubeで話題の動画、みんなはどう思う？🎥✨";
        description = `YouTubeで話題の動画をチェックらび！✨\n\n【動画元】\n${targetUrl}`;
    } else {
        // 普通の記事の場合
        title = title || "【注目】この記事の話題、みんなはどう思う？📡📰";
        description = `ネットで話題の記事をチェックらび！✨\n\n【記事元】\n${targetUrl}`;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const { data: sv, error: svErr } = await supabase.from('surveys').insert([{
        title: title,
        category: "ニュース・経済",
        tags: ["速報", "注目", "話題"],
        image_url: `yt:${videoId}`,
        deadline: deadline.toISOString(),
        visibility: 'public',
        description: description,
        is_official: true
    }]).select();

    if (svErr) {
        console.error('❌ 投稿失敗:', svErr.message);
        return;
    }

    const surveyId = sv[0].id;
    console.log(`✅ アンケート作成完了！ ID: ${surveyId}`);

    const options = ["非常に関心がある", "少し気になる", "今のところ静観", "詳しく調べたい"];
    await supabase.from('options').insert(
        options.map(name => ({ name, votes: 0, survey_id: surveyId }))
    );

    // らびのコメント
    await supabase.from('comments').insert([{
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: `新しいトピックスを見つけてきたよ！✨ この話題、みんなはどう思うかな？\n動画や記事のリンクもチェックしてみてね。らびと一緒に話そうらび！🐰🛡️🥇🏆`,
        edit_key: 'labi_bot'
    }]);

    console.log(`🚀 https://minna-no-vote-square.vercel.app/s/${surveyId}`);
}

// コマンドライン引数からURLを取得
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('使用法: node scripts/magic_post.cjs <URL> [タイトル]');
} else {
    createSurvey(args[0], args[1]);
}
