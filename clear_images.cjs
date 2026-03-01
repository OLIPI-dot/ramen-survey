
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const envPath = './.env.local';
    if (!fs.existsSync(envPath)) {
        console.error('Environment file not found!');
        process.exit(1);
    }

    const env = fs.readFileSync(envPath, 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=["']?(.*?)["']?$/m);
    const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=["']?(.*?)["']?$/m);

    if (!urlMatch || !keyMatch) {
        console.error('Supabase URL or Key not found in .env.local');
        process.exit(1);
    }

    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim();

    const supabase = createClient(url, key);

    console.log('Clearing all survey images for Minimalism Mode...');
    // Set image_url to null or empty string for all surveys
    const { data, error } = await supabase.from('surveys').update({ image_url: '' }).neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to target all

    if (error) {
        console.error('Error clearing images:', error.message);
    } else {
        console.log('Successfully cleared images from all surveys!');
    }
    console.log('Migration finished!');
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
