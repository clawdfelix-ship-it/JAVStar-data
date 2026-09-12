import { NextResponse } from 'next/server';

// Server-side proxy：拉 flash-bids.com「正在拍賣（status=active）」嘅貨。
// 貨品會隨時上下架，所以唔寫死任何 ID——每次即時拉 getPublicProducts 再篩，
// 只喺呢層快取 30s 減輕 upstream 負擔（2026-09-11 改用 flash-bids/Base44）。
//
// flash-bids 係 Base44 app：
//   GET /api/apps/{APP_ID}/functions/getPublicProducts  (X-App-Id header)
//   回 { products: [{ id, title, images[], current_price(HKD), total_bids,
//                     auction_end, status, category, ... }] }
//   產品頁：https://flash-bids.com/Auction?id={id}
export const revalidate = 30;

const FLASH_APP_ID = process.env.FLASHBIDS_APP_ID || '69bba94a8ae5b5513d580f59';
const SITE_BASE = (
  process.env.NEXT_PUBLIC_AUCTION_URL ||
  process.env.AUCTION_SITE_URL ||
  'https://flash-bids.com'
).replace(/\/$/, '');
const API_ORIGIN = (process.env.AUCTION_API_BASE || SITE_BASE).replace(/\/$/, '');

const CATEGORY_ZH: Record<string, string> = {
  polaroid: '拍立得',
  photobook: '寫真',
  merch: '周邊',
  pokemon_cards: '卡牌',
  alcohol: '酒類',
};

// base44 檔案 URL 會 302 跳去 media.base44.com，直接轉成最終 URL 省一次 redirect
function toMediaUrl(u: unknown): string | null {
  if (typeof u !== 'string' || !u) return null;
  const m = u.match(/files\/mp\/public\/[^/]+\/(.+)$/);
  if (m) return `https://media.base44.com/images/public/${FLASH_APP_ID}/${m[1]}`;
  return u;
}

export async function GET() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      `${API_ORIGIN}/api/apps/${FLASH_APP_ID}/functions/getPublicProducts`,
      {
        headers: { 'X-App-Id': FLASH_APP_ID, Accept: 'application/json' },
        signal: ctrl.signal,
        next: { revalidate: 30 },
      }
    );
    clearTimeout(timer);
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    const products: any[] = Array.isArray(data?.products) ? data.products : [];

    const now = Date.now();
    const items = products
      // 只顯示真正拍賣中：status=active 且未完場（時間做雙保險）
      .filter((p) => p?.status === 'active' && p?.auction_end && Date.parse(p.auction_end) > now)
      .sort((a, b) => Date.parse(a.auction_end) - Date.parse(b.auction_end)) // 最快完場排頭
      .slice(0, 20)
      .map((p) => ({
        id: String(p.id),
        title: String(p.title || p.sku || '拍賣品'),
        idolName: null, // flash-bids 冇獨立偶像欄位，名已在標題內
        category: CATEGORY_ZH[String(p.category)] || p.category || null,
        coverUrl: toMediaUrl(Array.isArray(p.images) ? p.images[0] : null),
        lotUrl: `${SITE_BASE}/Auction?id=${encodeURIComponent(p.id)}`,
        // current_price 係 HKD 整數；前端合約用 cents
        price: Math.round(Number(p.current_price || 0) * 100),
        bidCount: Number(p.total_bids || 0),
        endTime: Date.parse(p.auction_end),
      }));

    return NextResponse.json(
      { ok: true, items, serverNow: now },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (e) {
    // 拍賣站掛咗都唔好阻塞日曆首頁——回空列表，前端自己收埋
    return NextResponse.json(
      { ok: false, items: [], serverNow: Date.now() },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
      }
    );
  }
}
