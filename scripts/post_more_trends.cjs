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

const surveys = [
    {
        title: "【衝撃】田舎暮らしYouTuber「村八分」裁判。自分だったら……？⚖️🧱",
        category: "ニュース・経済",
        description: "高知県土佐市で起きたとされる「地域おこし協力隊員への村八分」騒動。裁判で勝訴したものの、地方移住の難しさが浮き彫りになったらび。みんなはどう思う？",
        options: ["すぐ逃げる！", "徹底的に戦う", "知人を頼る", "そもそも田舎に住まない"],
        comment: "りんさん、裁判勝訴おめでとうらびっ！✨ でも、こんなことが現実にあるなんて本当に胸が痛むよね……。みんなが安心して暮らせる広場（コミュニティ）を作っていきたいらび！🐰🛡️"
    },
    {
        title: "【閲覧注意】生き物系配信者の「ネズミ寿司」動画。規制すべき？🐭🍣",
        category: "エンタメ",
        description: "過激なコンテンツで再生数を稼ぐ手法が問題視されているらび。プラットフォーム側の自主規制か、それとも法的なルールが必要なのか、みんなの意見を教えてね。",
        options: ["表現の自由", "厳しく規制すべき", "ゾーニングが必要", "チャンネル通報レベル"],
        comment: "らびっ……！？😱 タイムラインに流れてきて、らびもブルブル震えちゃったよぉ……。みんなはこういう過激な動画、どう思う……？🐰🥕"
    },
    {
        title: "【激震】人気YouTuberの一斉「収益化停止」。これからの配信者はどうなる？💰⚠️",
        category: "IT・テクノロジー",
        description: "YouTubeの広告収益だけに頼るモデルが限界を迎えつつあるのかもしれないらび。これからのクリエイターに必要な「生き残り戦略」について、みんなで考えてみよう！",
        options: ["他プラットフォームへ移住", "有料ファンクラブ化", "潔く引退", "修正して再申請を目指す"],
        comment: "100万人以上いても収益化が止まっちゃんて、配信者の世界は本当に厳しいらび……。💦 但し、ファンのみんなとの絆があれば、きっと新しい道が見つかるはずらびっ！🐰✨"
    },
    {
        title: "【30周年】今年の「てりたま」、もう食べた？🍔✨",
        category: "グルメ",
        description: "マクドナルドの春の定番「てりたま」が30周年を迎えたらび！期間限定の味、みんなはもうチェックしたかな？🐰🌸",
        options: ["食べたよ！", "これから食べる！", "30周年おめでとう！"],
        comment: "30周年おめでとうらびっ！🍔✨ 春といえばやっぱりコレだよね！らびも瀬戸内レモンのやつが気になってるらび〜っ！🍋🐰"
    }
];

async function postSurveys() {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // 7日間

    for (const s of surveys) {
        console.log(`🚀 投稿中: ${s.title}`);
        
        // 1. アンケート挿入
        const { data: surveyData, error: surveyError } = await supabase.from('surveys').insert([{
            title: s.title,
            category: s.category,
            description: s.description,
            is_official: true,
            deadline: deadline.toISOString(),
            visibility: 'public'
        }]).select();

        if (surveyError) {
            console.error(`❌ アンケート失敗 (${s.title}):`, surveyError);
            continue;
        }

        const surveyId = surveyData[0].id;

        // 2. 選択肢挿入
        const { error: optionError } = await supabase.from('options').insert(
            s.options.map(name => ({ name, votes: 0, survey_id: surveyId }))
        );

        if (optionError) {
            console.error(`❌ 選択肢失敗 (${s.title}):`, optionError);
        }

        // 3. らびのコメント挿入
        const { error: commentError } = await supabase.from('comments').insert([{
            survey_id: surveyId,
            user_name: 'らび🐰(AI)',
            content: s.comment,
            edit_key: 'labi_bot'
        }]);

        if (commentError) {
            console.error(`❌ コメント失敗 (${s.title}):`, commentError);
        }

        console.log(`✅ 完了: ${s.title}`);
    }
}

postSurveys();
