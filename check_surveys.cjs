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

async function checkSurveys() {
    const res = await fetch(`${url}/rest/v1/surveys?select=title,id&order=created_at.desc&limit=5`, {
        method: 'GET',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });

    const data = await res.json();
    console.log('Latest surveys:', data);
}

checkSurveys().catch(console.error);
