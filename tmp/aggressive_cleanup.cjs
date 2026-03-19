const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith(key + '=')) {
                    return trimmed.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }
    return null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupRecent() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  console.log(`Searching for surveys created after ${twoHoursAgo}...`);
  
  const { data, error } = await supabase
    .from('surveys')
    .select('id, title')
    .gt('created_at', twoHoursAgo);

  if (error) {
    console.error('Search error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No recent surveys found.');
    return;
  }

  for (const s of data) {
    console.log(`Deleting ID ${s.id}: ${s.title}...`);
    await supabase.from('comments').delete().eq('survey_id', s.id);
    await supabase.from('options').delete().eq('survey_id', s.id);
    const { error: delError } = await supabase.from('surveys').delete().eq('id', s.id);
    if (delError) console.error(`Error deleting ${s.id}:`, delError);
    else console.log(`Deleted ${s.id} successfully!`);
  }
}

cleanupRecent();
