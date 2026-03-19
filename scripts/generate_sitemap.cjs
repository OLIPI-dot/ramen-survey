const fs = require('fs');
const path = require('path');

// 環境変数の取得
const getEnv = (key) => {
    if (process.env[key]) return process.env[key];
    let envFile = '';
    const localEnv = path.join(__dirname, '../.env.local');
    const rootEnv = path.join(__dirname, '../.env');
    if (fs.existsSync(localEnv)) envFile = fs.readFileSync(localEnv, 'utf8');
    else if (fs.existsSync(rootEnv)) envFile = fs.readFileSync(rootEnv, 'utf8');

    const match = envFile.split('\n').find(line => line.startsWith(`${key}=`));
    if (match) return match.split('=')[1].trim().replace(/^["'](.*)["']$/, '$1');
    return null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');
const SITE_URL = 'https://minna-no-vote-square.vercel.app';

if (!url || !key) {
    console.error('Environment variables missing!');
    process.exit(1);
}

async function generateSitemap() {
    console.log('探検開始！アンケートの道しるべ（サイトマップ）を作るよ！🐰🗺️');

    // 1. 公開設定のアンケートを全件取得
    const res = await fetch(`${url}/rest/v1/surveys?visibility=eq.public&select=id,created_at`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });

    if (!res.ok) {
        console.error('アンケートの取得に失敗したらび…', await res.text());
        return;
    }

    const surveys = await res.json();
    console.log(`✅ ${surveys.length} 件のアンケートを見つけたよ！`);

    // 2. サイトマップの組み立て
    const now = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- メインページ -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- 静的コンテンツ -->
  <url>
    <loc>${SITE_URL}/about.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/terms.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy.html</loc>
    <lastmod>${now}</lastmod>
    <priority>0.3</priority>
  </url>
`;

    // 3. 各アンケートのURLを追加
    surveys.forEach(sv => {
        const lastmod = sv.created_at ? sv.created_at.split('T')[0] : now;
        xml += `  <url>
    <loc>${SITE_URL}/s/${sv.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    });

    xml += `</urlset>`;

    // 4. ファイル保存
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(sitemapPath, xml);
    console.log(`✨ サイトマップの更新が完了したよ！ [${sitemapPath}]`);
    console.log('これで検索エンジンのボットさんも迷わず来れるね！らびっ！🐰🌈');
}

generateSitemap().catch(console.error);
