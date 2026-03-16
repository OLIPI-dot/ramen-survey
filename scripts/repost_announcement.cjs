const fs = require('fs');
const path = require('path');

const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    let envFile = '';
    if (fs.existsSync('.env.local')) envFile = fs.readFileSync('.env.local', 'utf8');
    else if (fs.existsSync('.env')) envFile = fs.readFileSync('.env', 'utf8');
    const match = envFile.split('\n').find(line => line.startsWith(`${key}=`));
    if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

const topicsPath = path.join(__dirname, '../src/data/labi_topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
const announcement = topics[0]; // The first one is the announcement

async function repost() {
    console.log('🚀 お知らせ再投稿ミッション開始！');

    // 1. 既存のお知らせを検索して削除
    const searchRes = await fetch(`${url}/rest/v1/surveys?tags=cs.%7B"お知らせ"%7D&select=id`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (searchRes.ok) {
        const existing = await searchRes.json();
        for (const s of existing) {
            console.log(`🗑️ 古いお知らせを削除中... (ID: ${s.id})`);
            await fetch(`${url}/rest/v1/surveys?id=eq.${s.id}`, {
                method: 'DELETE',
                headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
            });
        }
    }

    // 2. 新しいお知らせを投稿
    const deadlineUTC = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days for announcement
    const surveyData = {
        title: announcement.title,
        category: 'らび',
        visibility: 'public',
        deadline: deadlineUTC,
        tags: announcement.tags
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

    const created = await res.json();
    const surveyId = created[0].id;
    console.log(`✅ 新しい特盛お知らせを投稿しました！ ID: ${surveyId}`);

    // 3. 選択肢
    const optsData = announcement.options.map(optName => ({
        survey_id: surveyId,
        name: optName,
        votes: 0
    }));
    await fetch(`${url}/rest/v1/options`, {
        method: 'POST',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(optsData)
    });

    // 4. らびコメント
    const commentData = {
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: '広場を大切に思ってくれるみんな、いつもありがとう！🥕✨ 運営の想い、ぜひ読んでみてねっ！',
        edit_key: 'labi_bot'
    };
    await fetch(`${url}/rest/v1/comments`, {
        method: 'POST',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([commentData])
    });

    console.log('🐰🌈 特盛お知らせ、配信完了らびっ！🥕✨');
}

repost().catch(console.error);
