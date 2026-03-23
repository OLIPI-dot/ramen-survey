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

const DEFAULT_NEWS_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1000';

async function fillMissingImages() {
    console.log('🖼️ 画像がないニュースアンケートにデフォルト画像を設定するらび！');

    const { data, error } = await supabase
        .from('surveys')
        .select('id, title, category, image_url')
        .or('category.eq.ニュース,category.eq.話題')
        .or('image_url.is.null,image_url.eq.""');

    if (error) {
        console.error('取得失敗:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('✅ 修正が必要なアンケートは見つかりませんでした！');
        return;
    }

    for (const s of data) {
        const { error: updateErr } = await supabase
            .from('surveys')
            .update({ image_url: DEFAULT_NEWS_IMAGE })
            .eq('id', s.id);

        if (updateErr) {
            console.error(`❌ 修正失敗 [${s.id}]: ${updateErr.message}`);
        } else {
            console.log(`✅ 画像設定完了: [${s.id}] ${s.title}`);
        }
    }

    console.log('✨ 画像補完完了らび！');
}

fillMissingImages();
