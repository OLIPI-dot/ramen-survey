import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  const { s } = req.query;

  if (!s) {
    return res.status(404).send('Not Found');
  }

  try {
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', s)
      .single();

    if (error || !survey) {
      return res.status(404).send(`Survey not found for ID: ${s}. (Error: ${error?.message})`);
    }

    // ... (imageUrl calculation remains same)
    let imageUrl = 'https://minna-no-vote-square.vercel.app/ogp-image.png';
    if (survey.image_url) {
      if (survey.image_url.includes('yt:')) {
        const videoId = survey.image_url.split(',').map(v => v.trim()).find(v => v.startsWith('yt:')).substring(3);
        imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (survey.image_url.startsWith('http')) {
        imageUrl = survey.image_url;
      }
    }

    const title = `📊「${survey.title}」| みんなのアンケート広場`;
    const description = survey.description || '匿名で気軽に投票・本音が集まるアンケートコミュニティ。あなたの意見を教えてください！';
    const siteUrl = `https://minna-no-vote-square.vercel.app/?s=${s}`;

    // 🤖 ロボット専用の軽量メタページを生成
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${siteUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta property="og:site_name" content="みんなのアンケート広場" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="Eye-catch" style="max-width: 100%;" />
  <hr />
  <p>魔法発動中...🪄 (Survey ID: ${s})</p>
  <script>
    // magic=1 の時はデバッグのためにリダイレクトしない
    if (!window.location.search.includes('magic=1')) {
      window.location.href = "/?s=${s}";
    } else {
      console.log("Debug mode: Redirection skipped.");
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err.message}. (Supabase URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey})`);
  }
}
