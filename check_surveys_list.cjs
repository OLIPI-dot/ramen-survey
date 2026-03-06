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

async function listAndDeleteSurveys() {
    console.log('🔍 現在のアンケート一覧を取得します...');
    const res = await fetch(`${url}/rest/v1/surveys?select=id,title&order=id.desc&limit=10`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });
    const surveys = await res.json();
    console.table(surveys);

    // 重複や不要なアンケートのIDを特定して削除（ここではユーザーに確認してもらうためのリストアップ）
}

listAndDeleteSurveys();
