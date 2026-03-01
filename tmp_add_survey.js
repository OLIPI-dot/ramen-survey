import fs from 'fs';

const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
const envContent = fs.readFileSync(envFile, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

async function run() {
    const res = await fetch(`${url}/rest/v1/surveys?title=ilike.*今一番食べたいもの*`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const existing = await res.json();
    if (existing && existing.length > 0) {
        console.log('Already exists!');
        process.exit(0);
    }

    const res2 = await fetch(`${url}/rest/v1/surveys`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            title: 'らびからの質問！🥕 みんなが今一番食べたいものはなに？🐰🍽️',
            category: 'らび',
            visibility: 'public',
            tags: ['らび', 'ごはん', 'おなかすいた']
        })
    });
    const created = await res2.json();
    if (!created || !created[0]) {
        console.error('Failed to create survey:', created);
        process.exit(1);
    }
    const surveyId = created[0].id;

    const opts = ['もちろんニンジン！🥕', 'こってりラーメン🍜', 'がっつりお肉🥩', 'あまいスイーツ🍰', '新鮮なお寿司🍣'].map(n => ({
        survey_id: surveyId,
        name: n,
        votes: 0
    }));

    const res3 = await fetch(`${url}/rest/v1/options`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(opts)
    });
    console.log('SUCCESS');
    process.exit(0);
}
run();
