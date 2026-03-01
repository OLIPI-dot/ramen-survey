const fs = require('fs');
let envFile = '';
if (fs.existsSync('.env.local')) envFile = fs.readFileSync('.env.local', 'utf8');
else if (fs.existsSync('.env')) envFile = fs.readFileSync('.env', 'utf8');

const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

const deadlineUTC = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

async function createLabiSurvey() {
    const surveyData = {
        title: 'らびちゃん降臨！🐰 みんなが一番好きな「うさぎのポーズ」はどれ？🥕✨',
        category: 'らび',
        visibility: 'public',
        deadline: deadlineUTC,
        tags: ['らび', 'うさぎ', '可愛い']
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
    if (!created || !created[0]) {
        console.error('Failed to create survey:', created);
        process.exit(1);
    }

    const surveyId = created[0].id;
    console.log('Survey created! ID:', surveyId);

    const optsData = [
        { name: '耳をぴーんと立てて警戒ポーズ！🐇', votes: 0 },
        { name: 'まん丸になって寝てるおまんじゅうポーズ💤', votes: 0 },
        { name: '立ち上がって遠くを見るミーアキャットポーズ🐾', votes: 0 },
        { name: '顔をゴシゴシ洗うティラノサウルスポーズ🦖', votes: 0 }
    ].map(opt => ({
        survey_id: surveyId,
        name: opt.name,
        votes: opt.votes
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

    const optsResult = await resOpts.json();
    console.log('Options created!');

    // Add an initial comment from Labi!
    const commentData = {
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: 'みんなの意見を教えてね！らびは全部大しゅき！🥕🥕🥕',
        user_id: null,
        edit_key: 'labi_bot'
    };

    await fetch(`${url}/rest/v1/comments`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([commentData])
    });
    console.log('Initial comment created!');
}

createLabiSurvey().catch(console.error);
