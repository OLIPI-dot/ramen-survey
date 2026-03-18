const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (key) => {
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

async function postIranGasSurvey() {
    const title = "【緊急】ガソリン200円目前。米イ衝突によるホルムズ海峡封鎖、私たちの生活への影響をどう考える？⛽🧱";
    
    console.log('🧹 既存の重複チェック...');
    const { data: existing } = await supabase.from('surveys').select('id').eq('title', title);
    if (existing && existing.length > 0) {
        for (const ex of existing) {
            console.log(`🗑️ 旧データを削除中 (ID: ${ex.id})`);
            await supabase.from('comments').delete().eq('survey_id', ex.id);
            await supabase.from('options').delete().eq('survey_id', ex.id);
            await supabase.from('surveys').delete().eq('id', ex.id);
        }
    }

    console.log('🚀 アンケートを投稿します...');
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14); // 2週間

    const { data: surveyData, error: surveyError } = await supabase.from('surveys').insert([{
        title: title,
        category: "ニュース・経済",
        tags: ["ガソリン高騰", "米国イラン衝突", "ホルムズ海峡封鎖", "世界情勢"],
        image_url: "yt:sJ4b-rcdeHY",
        description: "ホルズ海峡の封鎖が現実味を帯び、ガソリン価格への影響が心配されているらび。米国イランの対立が私たちの生活にどう直結するのか、今のうちにみんなで考えておきたいテーマだね。⛽🧱",
        is_official: true,
        deadline: deadline.toISOString(),
        visibility: 'public'
    }]).select();

    if (surveyError) {
        console.error('❌ 投稿失敗:', surveyError);
        return;
    }

    const surveyId = surveyData[0].id;

    const options = [
        "家計が苦しい……補助金の拡充を求める💸",
        "エネルギー自給率やEVへのシフトを急ぐべき🔋",
        "国際社会が協力して早期停戦を働きかけるべき🌿",
        "備蓄放出などの緊急対策で耐えるしかない🧱"
    ];

    await supabase.from('options').insert(
        options.map(name => ({ name, votes: 0, survey_id: surveyId }))
    );

    await supabase.from('comments').insert([{
        survey_id: surveyId,
        user_name: 'らび🐰(AI)',
        content: "米海軍主導の作戦『壮絶な怒り』が始まって、ホルムズ海峡が封鎖される事態になっちゃったらび……😰 日本の石油の9割はここを通るから、ガソリン高騰は本当に他人事じゃないらびね。アメリカが攻撃に踏み切ったのは、核兵器開発の阻止やテロの未然防止という重大な理由があるみたいだけど、私たちの生活がどうなるか本当に心配らび……🐰🛡️🧱",
        edit_key: 'labi_bot'
    }]);

    console.log(`✅ 投稿完了！ (ID: ${surveyId})`);
    console.log(`URL: http://localhost:5173/?s=${surveyId}`);
}

postIranGasSurvey();
