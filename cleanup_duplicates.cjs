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

// 削除対象のIDリスト
const targetIds = [143, 144, 145, 146, 147];

async function deleteSurveys() {
    for (const id of targetIds) {
        console.log(`🧹 アンケート ID: ${id} を削除します...`);
        const res = await fetch(`${url}/rest/v1/surveys?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            console.log(`✅ ID: ${id} の削除に成功しました！`);
        } else {
            console.error(`❌ ID: ${id} の削除に失敗しました:`, await res.text());
        }
    }
    console.log('✨ お掃除完了らびっ！🥕✨');
}

deleteSurveys();
