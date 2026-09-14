import { NextResponse } from 'next/server';

// Server-side proxy：鏡像 javstarmeet.com 首頁頂部 slider 嘅 banner 圖，
// 喺本站訂閱通知下面做廣告位。對方一換 slider，呢邊最遲 1 小時自動跟。
// 2026-09-14 起（Felix 指示：直接用佢 slider）。
export const revalidate = 3600;

const SHOP = (process.env.JAVSM_SHOP_ORIGIN || 'https://www.javstarmeet.com').replace(/\/$/, '');

export async function GET() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(SHOP, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JCHING-AdProxy/1.0)' },
      signal: ctrl.signal,
      next: { revalidate: 3600, tags: ['javsm-slider'] },
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const html = await r.text();

    // 首頁 slider 檔名：/cdn/shop/files/WEB_BANNER_<uuid>.png?v=<ts>[&width=N]
    const re = /cdn\/shop\/files\/(WEB_BANNER_[A-Za-z0-9_-]+\.(?:png|jpe?g|webp))\?v=(\d+)/g;
    const seen = new Map<string, string>(); // file -> version（保留首次出現次序）
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      if (!seen.has(m[1])) seen.set(m[1], m[2]);
    }

    const slides = [...seen.entries()].map(([file, v]) => ({
      // 桌面用 1600 闊（原圖約 3:1）；Shopify CDN 支援 width 參數
      imageDesktop: `${SHOP}/cdn/shop/files/${file}?v=${v}&width=1600`,
      imageMobile: `${SHOP}/cdn/shop/files/${file}?v=${v}&width=750`,
      // slider banner 喺對方網站冇設獨立連結，統一去商城
      url: SHOP,
    }));

    return NextResponse.json(
      { ok: slides.length > 0, slides, shop: SHOP },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, slides: [], shop: SHOP },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  }
}
