const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (key) => {
    const files = ['.env.local', '.env'];
    for (const f of files) {
        if (fs.existsSync(f)) {
            const content = fs.readFileSync(f, 'utf8');
            const match = content.split('\n').find(line => line.startsWith(`${key}=`));
            if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
        }
    }
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

async function checkLatest() {
    const { data, error } = await supabase
        .from('surveys')
        .select('id, title, created_at, is_official')
        .order('created_at', { ascending: false })
        .limit(10);
        
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Latest 5 Surveys:');
        data.forEach(s => {
            const jstTime = new Date(s.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`[${s.id}] ${s.title}`);
            console.log(`  🕒 Created (JST): ${jstTime} | Official: ${s.is_official}`);
        });
    }
}

checkLatest();
