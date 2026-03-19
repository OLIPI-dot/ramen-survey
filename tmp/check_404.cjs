const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (k) => {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    for (const l of lines) { if (l.startsWith(k + '=')) return l.split('=')[1].trim().replace(/^[\'\"](.*)[\'\"]$/, '$1'); }
    return null;
};
const s = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function check404() {
  const { data } = await s.from('surveys').select('*').eq('id', 404).single();
  console.log('--- Survey ID 404 ---');
  console.log('Title:', data.title);
  console.log('Image URL (Raw):', JSON.stringify(data.image_url));
  const entries = data.image_url.split(',').map(v => v.trim()).filter(Boolean);
  console.log('Entries:', entries);
}

check404();
