const fs = require('fs');

const getEnv = (key) => {
    let envFile = '';
    if (fs.existsSync('.env.local')) envFile = fs.readFileSync('.env.local', 'utf8');
    else if (fs.existsSync('.env')) envFile = fs.readFileSync('.env', 'utf8');
    const match = envFile.split('\n').find(line => line.startsWith(`${key}=`));
    if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const surveyId = 144; // 削除対象のID

async function deleteSurvey() {
    console.log(`🧹 アンケート ID: ${surveyId} を削除する魔法を唱えます...`);

    const res = await fetch(`${url}/rest/v1/surveys?id=eq.${surveyId}`, {
        method: 'DELETE',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        }
    });

    if (res.ok) {
        console.log('✅ 削除完了らびっ！広場がきれいになりました✨');
    } else {
        console.error('❌ 削除に失敗したかも？', await res.text());
    }
}

deleteSurvey();
