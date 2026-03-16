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

const TRENDING_TOPICS_2 = [
    {
        title: "侍ジャパン、今日の「最高の瞬間」はどれ？⚾️ 周東の3ラン？村上の満塁弾？",
        category: "スポーツ",
        options: ["周東選手の特大3ラン！", "村上選手の豪快満塁弾！", "投手陣の完璧なリレー", "ベンチの盛り上がり", "その他（コメントで教えて！）"],
        tags: ["WBC", "野球", "侍ジャパン", "トレンド"],
        comment: "WBC大勝おめでとう！⚾️🔥 周東選手と村上選手のホームラン、どっちもすごすぎて鳥肌立っちゃったらびっ！みんなはどっち派？✨"
    },
    {
        title: "ホロライブ・フェス 2026！会場・配信で一番「最高…！」ってなったステージは誰？🌲✨",
        category: "エンタメ",
        options: ["推しのソロステージ！", "ユニットでの豪華コラボ", "全体曲の圧倒的迫力", "MCパートの面白さ", "その他（コメントで教えて！）"],
        tags: ["hololivefesEXPO26", "ホロライブ", "推し活", "トレンド"],
        comment: "ホロフェス、めちゃくちゃ盛り上がってるね！🌲✨ みんなの推しへの愛をコメントにぶつけてほしいらびっ！🥕💎"
    },
    {
        title: "2026年「お花見」の予定は？🌸 どこで誰と楽しむのが一番？",
        category: "生活",
        options: ["定番の公園でお祭り気分", "川沿いを散歩しながら夜桜", "近所の穴場スポットで静かに", "旅行先の名所で贅沢に", "家からオンラインお花見"],
        tags: ["お花見", "春", "旅行", "トレンド"],
        comment: "桜の開花予想も出たね！🌸 お花見の準備、みんなはどうしてる？おすすめの場所があったらこっそり教えてほしいらびっ！🐰🍡"
    },
    {
        title: "日経平均5万5千円突破！📈 ぶっちゃけ「景気が良くなってる」って実感、ある？",
        category: "ニュース・経済",
        options: ["実感ある！ボーナスや給料が増えた", "少しだけ感じる（買い物しやすくなった）", "全く感じない（物価高の方がキツイ）", "逆に苦しくなってる…", "投資してるので資産は増えた！"],
        tags: ["日経平均", "経済", "ビジネス", "本音"],
        comment: "株価がすごいことになってるけど、みんなの生活はどうかな？📈💰 ニュースじゃ聞けない「本当のところ」を教えてほしいらびっ！🐰🥕"
    }
];

const deadlineUTC = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

async function postAll() {
    console.log('🚀 検索トレンド攻略作戦・第2弾！さらにお題を増やすよ！🐰✨');

    for (const topic of TRENDING_TOPICS_2) {
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
