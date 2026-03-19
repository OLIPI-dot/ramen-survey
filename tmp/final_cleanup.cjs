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

async function finalCleanup() {
  const idsToDelete = [376, 387, 388, 389, 390, 391]; // Already 391 deleted but to be safe
  for (const id of idsToDelete) {
    console.log(`Deleting ID ${id}...`);
    await supabase.from('comments').delete().eq('survey_id', id);
    await supabase.from('options').delete().eq('survey_id', id);
    await supabase.from('surveys').delete().eq('id', id);
  }
}

finalCleanup();
