const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (key) => {
    let envFile = '';
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            envFile = fs.readFileSync(p, 'utf8');
            break;
        }
    }
    const match = envFile.split('\n').find(line => line.startsWith(`${key}=`));
    if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
    return null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const updates = [
    {
        titlePart: "村八分",
        newCategory: "エンタメ",
        newTags: ["YouTuber", "りんの田舎暮らし", "村八分", "裁判"],
        newDescription: "高知県土佐市で起きてしまった「地域おこし協力隊員への村八分」騒動。裁判の結果や、地方移住のリアルについてみんなで見守っていこうらび。",
        newVideo: "yt:R9_mS9X8Xuo" // プレフィックス付きに変更
    },
    {
        titlePart: "ネズミ寿司",
        newCategory: "エンタメ",
        newTags: ["飯島レンジ", "炎上", "規約", "衝撃動画"],
        newDescription: "話題の過激動画についてのアンケートらび。規約と表現の自由、みんなはどう考えるかな？",
        newVideo: "yt:P2L-0wY8J7c"
    },
    {
        titlePart: "収益化停止",
        newCategory: "エンタメ",
        newTags: ["あんずチャンネル", "収益化", "YouTube規約", "AI判定"],
        newDescription: "人気クリエイターの収益化停止ニュース。明日は我が身かもしれない配信者の世界について話そうらび。",
        newVideo: "yt:9_iIDY9-Ems"
    },
    {
        titlePart: "てりたま",
        newCategory: "グルメ",
        newTags: ["マクドナルド", "てりたま", "春の風物詩", "30周年"],
        newDescription: "マックの定番「てりたま」30周年のニュースらび！🌸🍔",
        newVideo: "yt:kY0vV5Psq7c"
    }
];

async function updateSurveys() {
    for (const u of updates) {
        console.log(`🔍 検索中: ${u.titlePart}`);
        
        // 1. タイトルの一部でアンケートを検索
        const { data: surveyData, error: searchError } = await supabase
            .from('surveys')
            .select('id, title')
            .ilike('title', `%${u.titlePart}%`)
            .order('created_at', { ascending: false })
            .limit(1);

        if (searchError || !surveyData || surveyData.length === 0) {
            console.error(`❌ 見つかりませんでした (${u.titlePart})`);
            continue;
        }

        const surveyId = surveyData[0].id;
        console.log(`🎯 修正対象: ${surveyData[0].title} (ID: ${surveyId})`);

        // 2. データの更新（カテゴリ、タグ、動画URL、フラグ、解説文）
        const { error: updateError } = await supabase
            .from('surveys')
            .update({
                category: u.newCategory,
                tags: u.newTags,
                image_url: u.newVideo,
                is_official: true,
                description: u.newDescription
            })
            .eq('id', surveyId);

        if (updateError) {
            console.error(`❌ 更新失敗 (${u.titlePart}):`, updateError);
        } else {
            console.log(`✅ 更新完了: ${u.titlePart}`);
        }
    }
}

updateSurveys();
