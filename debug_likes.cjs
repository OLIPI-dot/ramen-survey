
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function debugLikes() {
    const envPath = './.env.local';
    if (!fs.existsSync(envPath)) {
        console.error('Environment file not found!');
        process.exit(1);
    }

    const env = fs.readFileSync(envPath, 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=["']?(.*?)["']?$/m);
    const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=["']?(.*?)["']?$/m);

    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim();
    const supabase = createClient(url, key);

    console.log('--- 🛡️ Integrity Check: Likes ---');

    // 1. Check if column exists
    const { data: firstSurvey, error: fetchErr } = await supabase.from('surveys').select('*').limit(1);
    if (fetchErr) {
        console.error('❌ Error fetching survey:', fetchErr.message);
    } else if (firstSurvey && firstSurvey.length > 0) {
        console.log('✅ Found a survey. ID:', firstSurvey[0].id, 'Likes:', firstSurvey[0].likes_count);
        if (!('likes_count' in firstSurvey[0])) {
            console.error('❌ likes_count column MISSING!');
        } else {
            // 2. Test RPC with this real ID
            const realId = firstSurvey[0].id;
            console.log(`🚀 Testing RPC with real ID: ${realId}`);
            const { error: rpcErr } = await supabase.rpc('increment_survey_like', {
                survey_id: realId,
                increment_val: 1
            });

            if (rpcErr) {
                console.error('❌ RPC Failed:', rpcErr.message, rpcErr.hint || '');
            } else {
                console.log('✅ RPC Success! Let\'s verify the count increased...');
                const { data: updatedSurvey } = await supabase.from('surveys').select('likes_count').eq('id', realId).single();
                console.log('New likes count:', updatedSurvey.likes_count);
            }
        }
    } else {
        console.log('❓ No surveys found to test with.');
    }
}

debugLikes();
