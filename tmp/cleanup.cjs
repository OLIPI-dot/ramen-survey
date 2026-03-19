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

async function cleanup() {
  const ids = [376, 391];
  for (const id of ids) {
    console.log(`Cleaning up ID ${id}...`);
    await supabase.from('comments').delete().eq('survey_id', id);
    await supabase.from('options').delete().eq('survey_id', id);
    const { error } = await supabase.from('surveys').delete().eq('id', id);
    if (error) console.error(`Error deleting ${id}:`, error);
    else console.log(`Deleted ${id} successfully!`);
  }
}

cleanup();
