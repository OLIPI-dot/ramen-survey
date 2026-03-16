const fs = require('fs');
const path = require('path');

// 環境変数の取得
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    let envFile = '';
    const localEnv = path.join(__dirname, '../.env.local');
    const rootEnv = path.join(__dirname, '../.env');
    if (fs.existsSync(localEnv)) envFile = fs.readFileSync(localEnv, 'utf8');
    else if (fs.existsSync(rootEnv)) envFile = fs.readFileSync(rootEnv, 'utf8');

    const match = envFile.split('\n').find(line => line.startsWith(`${key}=`));
    if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

const TRENDING_TOPICS = [
    {
        title: "WBC日本代表、あなたが選ぶ『今日のMVP』は誰？🔥⚾️",
        category: "スポーツ",
        options: ["大谷翔平選手", "ダルビッシュ有選手", "鈴木誠也選手", "村上宗隆選手", "周東佑京選手（神走塁！）", "その他（コメントで教えて！）"],
        tags: ["WBC", "野球", "侍ジャパン", "トレンド"],
        comment: "WBC、盛り上がってるね！⚾️ みんなの胸を熱くさせたプレーはどれ？らびも応援してるらびっ！🥕✨"
    },
    {
        title: "3.11から15年。いま改めて見直した『防災対策』、一番優先したのはどれ？🩹🕯️",
        category: "生活",
        options: ["非常食・飲料水の備蓄", "避難場所・経路の再確認", "家具の固定・転倒防止", "防災用ポータブル電源・電池", "家族との連絡手段を決める"],
        tags: ["3.11", "防災", "生活", "大事なこと"],
        comment: "今日は大切な日だね。🕯️ 万が一に備えて、みんなが「これだけは！」と思っている対策を教えてね。🐰🛡️"
    },
    {
        title: "日本ゴールドディスク大賞2026！あなたにとっての『今年のNo.1推し曲』は？🎧💎",
        category: "エンタメ",
        options: ["大賞受賞のあの曲！", "SNSで流行ったあのダンス曲", "個人的にリピし続けてる隠れた名曲", "アニメ主題歌でハマった曲"],
        tags: ["ゴールドディスク大賞", "音楽", "エンタメ", "推し活"],
        comment: "音楽の祭典、ワクワクするね！💎 みんなの耳を幸せにしてくれた曲をらびにも教えてほしいらびっ！🎵🐰"
    },
    {
        title: "ChatGPT・Claude・Gemini… 毎日一番頼りにしてるパートナー(AI)はどの子？🤖💻",
        category: "IT・テクノロジー",
        options: ["ChatGPT (OpenAI)", "Claude (Anthropic)", "Gemini (Google)", "Perplexity", "その他のAI"],
        tags: ["AI", "ChatGPT", "トレンド", "技術"],
        comment: "AIさんが身近になってきたよね！🤖 おりぴさんみたいにAIさんと仲良くしてるみんなは、どの子がお気に入りなのかな？🐰🥕"
    }
];

const deadlineUTC = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

async function postAll() {
    console.log('🚀 検索トレンド攻略作戦、開始！ばばばばっ！と投稿するよ！🐰✨');

    for (const topic of TRENDING_TOPICS) {
        console.log(`\n📦 投稿中: [${topic.title}]`);

        // 1. アンケート作成
        const res = await fetch(`${url}/rest/v1/surveys`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                title: topic.title,
                category: topic.category,
                visibility: 'public',
                deadline: deadlineUTC,
                tags: topic.tags
            })
        });

        if (!res.ok) {
            console.error(`❌ 失敗らび: ${topic.title}`, await res.text());
            continue;
        }

        const [survey] = await res.json();
        const surveyId = survey.id;
        console.log(`✅ 作成完了！ ID: ${surveyId}`);

        // 2. 選択肢追加
        const resOpts = await fetch(`${url}/rest/v1/options`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(topic.options.map(name => ({
                survey_id: surveyId,
                name: name,
                votes: 0
            })))
        });
        if (resOpts.ok) console.log('✅ 選択肢の追加完了！');

        // 3. 初期コメント
        await fetch(`${url}/rest/v1/comments`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                survey_id: surveyId,
                user_name: 'らび🐰(AI)',
                content: topic.comment,
                user_id: null,
                edit_key: 'labi_bot'
            })
        });
        console.log('✅ らびのコメント完了！');
    }

    console.log('\n🐰🌈 ぜんぶ投稿おわったよ！最後におまじない（サイトマップ更新）をするね！✨');
}

postAll().catch(console.error);
