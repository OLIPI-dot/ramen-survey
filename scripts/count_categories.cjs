const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
    });
}
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCategories() {
    const { data, error } = await supabase.from('surveys').select('category');
    if (error) {
        console.error(error);
        return;
    }
    const counts = {};
    data.forEach(s => counts[s.category] = (counts[s.category] || 0) + 1);
    console.log(JSON.stringify(counts, null, 2));
}
checkCategories();
