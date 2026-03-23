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

async function cleanupRabiCategory() {
    console.log('🔍 「らび」カテゴリのアンケートをクリーンアップするらび！');

    // 1. 「らび」カテゴリのアンケートを取得
    const { data, error } = await supabase
        .from('surveys')
        .select('id, title, category')
        .eq('category', 'らび');

    if (error) {
        console.error('取得失敗:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('✅ 「らび」カテゴリのアンケートは見つかりませんでしたらび！');
        return;
    }

    console.log(`📝 ${data.length}件のアンケートを修正するらび...`);

    for (const s of data) {
        // 基本的に「ニュース」か「話題」に変更するらび
        // タイトルにニュースっぽい言葉があれば「ニュース」、そうでなければ「話題」
        const newCat = /(ニュース|発表|決定|公開|話題)/.test(s.title) ? 'ニュース' : '話題';
        
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

    console.log('✨ クリーンアップ完了らび！');
}

cleanupRabiCategory();
