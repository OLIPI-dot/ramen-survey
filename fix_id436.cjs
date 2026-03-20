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

async function update() {
  const { data, error } = await supabase
    .from('surveys')
    .update({ 
      category: 'ニュース・経済',
      tags: ['速報', '経済', '株価', 'NYダウ']
    })
    .eq('id', 436)
    .select();

  if (error) {
    console.error("DB update error:", error);
    return;
  }

  console.log("--- Updated Survey 436 ---");
  console.log(data);
}

update();
