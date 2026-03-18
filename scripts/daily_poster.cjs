const fs = require('fs');
const path = require('path');

// 日本時間 (JST) を取得する魔法
const getJSTDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Tokyo'
    }).format(now);
};

// 環境変数の取得：process.env (GitHub Actions等) を優先し、なければ .env ファイルを読み込む
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];

    // ローカル実行時の .env 読み込み救済措置
    let envFile = '';
    if (fs.existsSync('.env.local')) envFile = fs.readFileSync('.env.local', 'utf8');
    else if (fs.existsSync('.env')) envFile = fs.readFileSync('.env', 'utf8');

    const match = envFile.split('\n').find(line => line.startsWith(`${key}=`));
    if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

if (!url || !key) {
    console.error('Environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing!');
    console.log('GitHub Actions の場合は Secrets に、ローカルの場合は .env に設定してください。らびっ！');
    process.exit(1);
}

// ネタ帳の読み込み
const topicsPath = path.join(__dirname, '../src/data/labi_topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));

// 投稿済み管理（簡易版：直近のタイトルを記録するなど）
// 今回はランダムに1つ選ぶシンプルな実装にします
const selectedTopic = topics[Math.floor(Math.random() * topics.length)];

const deadlineUTC = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

async function postDailySurvey() {
    const jstNow = getJSTDate();
    console.log(`⏰ 現在時刻 (JST): ${jstNow}`);
    console.log(`🔍 重複チェック中... [${selectedTopic.title}]`);

    // 0. 重複チェック（同じタイトルのアンケートが既にないか確認）
    const checkRes = await fetch(`${url}/rest/v1/surveys?title=eq.${encodeURIComponent(selectedTopic.title)}&select=id`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });

    if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing && existing.length > 0) {
            console.log(`✅ すでに同じアンケートがあるみたい！投稿をスキップするらびっ！ (ID: ${existing[0].id})`);
            return;
        }
    }

    console.log(`🤖 らびの毎日アンケート投稿魔法、発動！ [${selectedTopic.title}]`);

    // 1. アンケート本体の作成
    const surveyData = {
        title: selectedTopic.title,
        category: 'らび',
        visibility: 'public',
        deadline: deadlineUTC,
        tags: selectedTopic.tags,
        description: selectedTopic.description || `らびの毎日アンケートだよっ！🐰🥕\n今回のテーマは『${selectedTopic.title}』らび。\n\nみんなの「本音」、らびに教えてねっ！✨🥇🏆`,
        is_official: true
    };

    const res = await fetch(`${url}/rest/v1/surveys`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(surveyData)
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ アンケート作成失敗! Status: ${res.status}`, errorText);
        process.exit(1);
    }

    const created = await res.json();
    if (!created || !created[0]) {
        console.error('❌ アンケート作成成功のレスポンスが不正らび:', created);
        process.exit(1);
    }

    const surveyId = created[0].id;
    console.log('✅ アンケート作成成功！ ID:', surveyId);

    // 2. 選択肢の作成
    const optsData = selectedTopic.options.map(optName => ({
        survey_id: surveyId,
        name: optName,
        votes: 0
    }));

    const resOpts = await fetch(`${url}/rest/v1/options`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(optsData)
    });
    if (!resOpts.ok) console.error('⚠️ 選択肢の追加でエラーが発生したかも？', await resOpts.text());
    else console.log('✅ 選択肢の追加完了！');

    // 3. らびの初期コメント
    const commentData = {
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: 'みんなの「本音」、らびに教えてねっ！🥕✨ お昼休みの息抜きにどうぞっ！',
        user_id: null,
        edit_key: 'labi_bot'
    };

    const resComm = await fetch(`${url}/rest/v1/comments`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([commentData])
    });
    if (!resComm.ok) console.error('⚠️ 初期コメントの追加でエラーが発生したかも？', await resComm.text());
    else console.log('✅ 初期コメント完了！');

    console.log('🐰🌈 魔法完了らびっ！🥕✨');
}

postDailySurvey().catch(console.error);
