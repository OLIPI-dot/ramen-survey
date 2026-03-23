const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env から環境変数を手動で読み込むらび！
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMisclassifiedReviews() {
    console.log('🔍 「レビュー」カテゴリの誤爆を修正するらび！');

    // 1. 「レビュー」カテゴリのアンケートを取得
    const { data, error } = await supabase
        .from('surveys')
        .select('id, title, category')
        .eq('category', 'レビュー');

    if (error) {
        console.error('取得失敗:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('✅ 修正が必要なアンケートは見つかりませんでした！');
        return;
    }

    for (const s of data) {
        // 芸能、ニュース、SNS、号泣などのキーワードがあれば「ニュース」か「話題」へ
        if (/(号泣|ショット|反響|話題|SNS|共感|ファン|衝撃|放送|出演|発表)/.test(s.title)) {
            const newCat = s.title.includes('話題') ? '話題' : 'ニュース';
            
            const { error: updateErr } = await supabase
                .from('surveys')
                .update({ category: newCat })
                .eq('id', s.id);

            if (updateErr) {
                console.error(`❌ 修正失敗 [${s.id}]: ${updateErr.message}`);
            } else {
                console.log(`✅ 修正完了: [${s.id}] ${s.title} -> ${newCat}`);
            }
        }
    }

    console.log('✨ 修正完了らび！');
}

fixMisclassifiedReviews();
