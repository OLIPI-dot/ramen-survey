import { next } from '@vercel/edge';

export const config = {
  matcher: ['/'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const s = url.searchParams.get('s');
  const ua = request.headers.get('user-agent') || '';
  const isBot = /twitter|bot|facebook|facebot|slack|discord|google|whatsapp|link/i.test(ua);
  const isMagic = url.searchParams.get('magic') === '1';

  if (s && (isBot || isMagic)) {
    // クエリパラメータを維持したまま /api/og へリライト
    url.pathname = '/api/og';
    return Response.rewrite(url);
  }

  return next();
}
