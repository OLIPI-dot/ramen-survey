
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function testRpc() {
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

    console.log('Testing RPC increment_survey_like...');
    // A dummy ID or a known survey ID
    const dummyId = '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase.rpc('increment_survey_like', { survey_id: dummyId, increment: 1 });

    if (error) {
        console.log('RPC Test result:', error.message);
        if (error.message.includes('function') && error.message.includes('not found')) {
            console.log('CONCLUSION: RPC function increment_survey_like DOES NOT exist.');
        } else {
            console.log('CONCLUSION: RPC function might exist but failed (which is expected for dummy ID).');
        }
    } else {
        console.log('RPC Test result: Success (Surprisingly worked on dummy ID)');
        console.log('CONCLUSION: RPC function increment_survey_like EXISTS.');
    }
}

testRpc();
