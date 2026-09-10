import { NextResponse } from 'next/server';

// Server-side proxy：拉拍賣平台「正在拍賣」嘅貨，避開瀏覽器 CORS，
// 順手喺呢層快取 60s，減輕 auction API 負擔。
// 來源可用 AUCTION_API_BASE / NEXT_PUBLIC_AUCTION_URL 覆蓋。
export const revalidate = 60;

const API_BASE =
  process.env.AUCTION_API_BASE ||
  process.env.NEXT_PUBLIC_AUCTION_URL ||
  'https://auction-website-tan.vercel.app';

export async function GET() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${API_BASE.replace(/\/$/, '')}/api/live-lots`, {
      signal: ctrl.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (e) {
    // 拍賣站掛咗都唔好阻塞日曆首頁——回空列表，前端自己收埋
    return NextResponse.json(
      { ok: false, items: [], serverNow: Date.now() },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
      },
    );
  }
}
