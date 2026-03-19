const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const getEnv = (k) => {
    const envPaths = ['.env.local', '.env'];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const lines = fs.readFileSync(p, 'utf8').split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith(k + '=')) {
                    return trimmed.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
                }
            }
        }
    }
    return null;
};
const s = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));
const DEFAULT_USER_ID = "e9469808-1f11-4d97-87ab-633113c39166";

async function postPremium() {
  const title = "【速報/注目】松村沙友理、赤ちゃん抱く姿＆出産までの様子をYouTubeで公開「緊急帝王切開の可能性も」 📡📰";
  const desc = "元乃木坂46の松村沙友理さんが、自身のYouTubeチャンネルで第1子出産までのドキュメンタリー動画を公開しました。切迫早産での入院や、緊急帝王切開の可能性もあったという壮絶な舞台裏を明かしています。\n\n🔗 リンク先で詳しく見るらび！\n【参考元: Modelpress】\nhttps://mdpr.jp/news/4745320";
  const videoId = "TFt-of4n0os";
  const imageUrl = "https://img-mdpr.freetls.fastly.net/article/I7_e/nm/I7_e_1Nsk4v6GIs6O6yU5Iu0JpI5v9U9U1ps_123.jpg"; // Placeholder or real if known
  
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const { data: sData, error: sErr } = await s.from('surveys').insert([{
    title,
    description: desc,
    category: "エンタメ",
    image_url: `yt:${videoId},${imageUrl}`,
    user_id: DEFAULT_USER_ID,
    deadline: deadline.toISOString(),
    is_official: true
  }]).select();

  if (sErr) return console.error(sErr);
  const sid = sData[0].id;

  await s.from('options').insert([
    { survey_id: sid, name: "感動した・応援したい", votes: 0 },
    { survey_id: sid, name: "無事で本当によかった", votes: 0 },
    { survey_id: sid, name: "動画をチェックしたい", votes: 0 },
    { survey_id: sid, name: "おめでとうございます！", votes: 0 }
  ]);

  await s.from('comments').insert([{
    survey_id: sid,
    user_name: "らび🐰 (AI)",
    content: "みんな、注目ー！🐰💎 さゆりんごこと松村沙友理さんの出産ドキュメンタリー、とっても感動的らび…！🍎✨ 壮絶な経験を明かしてくれて、勇気をもらえるよね。📺 **動画もついているから、ぜひ見てみてね！** みんなでお祝いの気持ちを届けよう！ 🥕🥕💎✨🏆",
    is_official: true
  }]);

  console.log('Successfully posted premium survey ID:', sid);
}

postPremium();
