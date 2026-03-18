const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 環境変数取得
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            for (const line of lines) {
              if (line.trim().startsWith(key + '=')) {
                return line.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
              }
            }
        }
    }
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

async function migrate() {
    console.log('🚀 データベースのマイグレーションを開始します（is_official カラムの追加を試みます）...');
    
    // 💡 REST API 経由でカラム追加はできないため、RPC (SQL) を使う必要がありますが、
    // もし RPC が定義されていない場合は直接 insert/update で試行してカラムの存在を確認します。
    
    // その前に、まず既存のらびちゃんの投稿（自動投稿系）を特定してフラグを立てるテスト。
    // カラムがないとエラーになるはずなので、それで判定します。
    
    console.log('🧐 カラムの存在を確認＆データ更新を試行中...');
    
    // らびちゃんの投稿を特定（作者名やIDがnullのもの）
    const { data: surveys, error: fetchError } = await supabase
        .from('surveys')
        .select('id, title, user_id')
        .or('user_id.is.null,title.ilike.%らび%,title.ilike.%ラビ%,title.ilike.%【速報%');

    if (fetchError) {
        console.error('❌ データ取得エラー:', fetchError);
        return;
    }

    console.log(`🔍 候補となるアンケートを ${surveys.length} 件見つけたらび！`);

    // 💡 カラム追加は別途ダッシュボードから行うか、RPCを設定する必要があります。
    // ここでは、カラムがある前提で更新を試みて、失敗したらユーザーに通知します。
    
    const { error: updateError } = await supabase
        .from('surveys')
        .update({ is_official: true })
        .in('id', surveys.map(s => s.id));

    if (updateError) {
        if (updateError.message.includes('column "is_official" of relation "surveys" does not exist')) {
            console.error('⚠️ is_official カラムが存在しません。ダッシュボードで追加する必要があります。');
            console.log('--- SQL ---');
            console.log('ALTER TABLE surveys ADD COLUMN is_official BOOLEAN DEFAULT false;');
            console.log('UPDATE surveys SET is_official = true WHERE user_id IS NULL OR title ILIKE \'%らび%\' OR title ILIKE \'%【速報%\';');
            console.log('-----------');
        } else {
            console.error('❌ 更新エラー:', updateError);
        }
    } else {
        console.log('✅ 成功！既存のアンケートに公式フラグを立てたよっ！🥇🏆');
    }
}

migrate();
