const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (k) => {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    for (const l of lines) { if (l.startsWith(k + '=')) return l.split('=')[1].trim().replace(/^[\'\"](.*)[\'\"]$/, '$1'); }
    return null;
};
const s = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

async function debugThumbnails() {
  const { data } = await s.from('surveys').select('id, title, image_url').order('id', { ascending: false }).limit(5);
  console.log('--- Debugging App.jsx Parsing Logic ---');
  data.forEach(s => {
    console.log(`ID: ${s.id} | Title: ${s.title}`);
    console.log(`Raw image_url: [${s.image_url}]`);
    
    let thumbSrc = null;
    if (s.image_url) {
      const entries = s.image_url.split(',').map(v => v.trim()).filter(Boolean);
      console.log(`Entries:`, entries);
      const yt = entries.find(v => v.startsWith('yt:'));
      const nico = entries.find(v => v.startsWith('nico:'));
      
      if (yt) {
        thumbSrc = `https://img.youtube.com/vi/${yt.substring(3)}/hqdefault.jpg`;
        console.log(`YT Match! thumbSrc: ${thumbSrc}`);
      } else if (nico) {
        thumbSrc = `/assets/images/nico_fallback.jpg`;
        console.log(`Nico Match! thumbSrc: ${thumbSrc}`);
      } else if (entries[0] && !entries[0].includes(':')) {
        thumbSrc = entries[0];
        console.log(`Regular Image Match! thumbSrc: ${thumbSrc}`);
      }
    }
    if (!thumbSrc) console.log('Result: Falsy (Falling back to icon)');
    console.log('---');
  });
}

debugThumbnails();
