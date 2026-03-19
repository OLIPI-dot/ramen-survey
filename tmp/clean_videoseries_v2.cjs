const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (k) => {
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith(k + '=')) {
                    return trimmed.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }
    return null;
};
const s = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function cleanData() {
  console.log('--- Cleaning yt:videoseries ---');
  const { data, error } = await s.from('surveys').select('id, image_url').like('image_url', '%yt:videoseries%');
  if (error) { console.error('Select Error:', error); return; }
  
  if (data.length === 0) {
    console.log('No corrupted surveys found.');
    return;
  }

  for (const row of data) {
    console.log(`Processing ID ${row.id}, image_url: ${row.image_url}`);
    const entryList = row.image_url.split(',').map(v => v.trim()).filter(v => v !== 'yt:videoseries');
    const cleaned = entryList.join(',');
    console.log(`New image_url: ${cleaned || 'null'}`);
    
    const { error: updError } = await s.from('surveys').update({ image_url: cleaned || null }).eq('id', row.id);
    if (updError) {
      console.error(`Update Error for ID ${row.id}:`, updError);
    } else {
      console.log(`Successfully cleaned ID ${row.id}`);
    }
  }
}
cleanData();
