const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = 'i:/olipiprojects/antigravity-scratch/minna-no-vote-square/.env.local';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
            process.env[key] = value;
        }
    });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('surveys')
    .select('id, title, created_at, is_official')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("DB check error:", error);
    return;
  }

  console.log("--- Latest 10 Surveys ---");
  data.forEach(s => {
    console.log(`[ID:${s.id}] [${s.is_official ? 'OFFICIAL' : 'USER'}] ${s.title} (${s.created_at})`);
  });
}

check();
