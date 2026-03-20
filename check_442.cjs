const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = 'i:/olipiprojects/antigravity-scratch/minna-no-vote-square/.env.local';
const env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
            env[key] = value;
        }
    });
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('surveys')
    .select('id, title, category, tags')
    .eq('id', 442)
    .single();

  if (error) {
    console.error("DB check error:", error);
    return;
  }

  console.log("--- Newest Survey (ID:442) ---");
  console.log(JSON.stringify(data, null, 2));
}

check();
