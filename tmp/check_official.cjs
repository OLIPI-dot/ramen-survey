const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (key) => {
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const match = fs.readFileSync(p, 'utf8').split('\n').find(line => line.startsWith(`${key}=`));
            if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
        }
    }
    return null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: surveys, error } = await supabase
        .from('surveys')
        .select('id, title, is_official, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching surveys:", error);
        return;
    }

    console.log("Latest 20 surveys:");
    surveys.forEach(s => {
        console.log(`[ID: ${s.id}] [Official: ${s.is_official}] ${s.title}`);
    });
}
check();
