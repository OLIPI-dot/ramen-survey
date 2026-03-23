import { NextResponse } from 'next/server';

// 🤖 ボット（SNSのクローラー）かどうかを判定するらび！
const BOT_AGENTS = [
    'twitterbot',
    'facebookexternalhit',
    'line-poker',
    'discordbot',
    'skypeuripreview',
    'slackbot',
    'googlebot',
    'bingbot',
    'yandexbot',
    'applebot'
];

export function middleware(request) {
    const url = request.nextUrl;
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

    // 1. /s/ID 形式のパスかチェック
    const isSurveyPath = url.pathname.startsWith('/s/');
    
    if (isSurveyPath) {
        const id = url.pathname.split('/')[2];
        if (!id) return NextResponse.next();

        // 🤖 ボットの場合は OGP生成API に案内するらび！
        const isBot = BOT_AGENTS.some(bot => userAgent.includes(bot));
        
        if (isBot) {
            // /api/og?s=ID へ書き換える
            url.pathname = '/api/og';
            url.searchParams.set('s', id);
            return NextResponse.rewrite(url);
        }

        // 👤 人間の場合は そのまま index.html (SPA) を見せるらび！
        // Vercel のデフォルト挙動（Rewrites）に任せるか、明示的に index.html へ
        return NextResponse.next();
    }

    return NextResponse.next();
}

// 範囲を絞ってパフォーマンスを維持
export const config = {
    matcher: ['/s/:id*'],
};
