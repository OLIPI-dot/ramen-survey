const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (k) => {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    for (const l of lines) { if (l.startsWith(k + '=')) return l.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1'); }
    return null;
};
const s = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function cleanData() {
  const { data, error } = await s.from('surveys').select('id, image_url').like('image_url', '%yt:videoseries%');
  if (error) return console.error(error);
  console.log(`Found ${data.length} corrupted surveys.`);
  for (const row of data) {
    const entryList = row.image_url.split(',').map(v => v.trim()).filter(v => v !== 'yt:videoseries');
    const cleaned = entryList.join(',');
    await s.from('surveys').update({ image_url: cleaned || null }).eq('id', row.id);
    console.log(`Cleaned ID ${row.id}`);
  }
}
cleanData();
