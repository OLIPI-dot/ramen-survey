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

async function cleanAndVerify() {
  const targetId = 404;
  console.log(`Checking ID ${targetId}...`);
  const { data: before } = await s.from('surveys').select('image_url').eq('id', targetId).single();
  console.log('Before:', before.image_url);

  if (before.image_url.includes('yt:videoseries')) {
    console.log('Cleaning...');
    const cleaned = before.image_url.split(',').filter(v => v.trim() !== 'yt:videoseries').join(',');
    const { error } = await s.from('surveys').update({ image_url: cleaned }).eq('id', targetId);
    if (error) console.error('Error:', error);
    else console.log('Update call finished.');
  } else {
    console.log('Already clean.');
  }

  const { data: after } = await s.from('surveys').select('image_url').eq('id', targetId).single();
  console.log('After:', after.image_url);
}

cleanAndVerify();
