const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env または .env.local から環境変数を読み込む魔法
const getEnv = (key) => {
    const files = ['.env.local', '.env'];
    for (const f of files) {
        const filePath = path.join(__dirname, '..', f);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (line.startsWith(`${key}=`)) {
                    return line.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

if (!url || !key) {
    console.error('❌ SupabaseのURLまたはキーが見つからないらび……。');
    process.exit(1);
}

const supabase = createClient(url, key);

async function postTestSurvey() {
    const topic = {
        title: "🎨 広場のカテゴリ、どれが一番お気に入り？ 🐰✨",
        category: "トレンド",
        options: [
            "公式・ニュース 📢",
            "エンタメ・音楽 🎬🎵",
            "グルメ・生活 🍔🏠",
            "IT・ゲーム 💻🎮",
            "らび・その他 🐰❓"
        ],
        tags: ["テスト", "らび", "アプデ完了", "カテゴリ"],
        comment: "おりぴさん、カテゴリごとの投稿数が見えるようになったよ！✨ 記念に、みんながどのカテゴリをよくチェックしてるか教えてほしいらびっ！🐰🥕"
    };

    console.log(`🚀 「${topic.title}」を投稿しますらび！`);

    const { data: sv, error: svErr } = await supabase.from('surveys').insert([{
        title: topic.title,
        category: topic.category,
        tags: topic.tags,
        visibility: 'public',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }]).select();

    if (svErr) {
        console.error('❌ 投稿失敗:', svErr.message);
        return;
    }

    const surveyId = sv[0].id;
    console.log(`✅ アンケート作成完了！ ID: ${surveyId}`);

    await supabase.from('options').insert(topic.options.map(name => ({
        survey_id: surveyId,
        name: name,
        votes: 0
    })));
    console.log('✅ 選択肢の追加完了！');

    await supabase.from('comments').insert([{
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: topic.comment,
        edit_key: 'labi_bot'
    }]);
    console.log('✅ らびのコメント完了！');

    console.log('\n🐰✨ テストアンケートの投稿が大成功したらびっ！おりぴさん、広場で確認してみてね！🥕🌈');
}

postTestSurvey();
