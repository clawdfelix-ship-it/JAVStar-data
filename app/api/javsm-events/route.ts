import { NextResponse } from 'next/server';

// Server-side proxy：javstarmeet.com（Shopify）首頁 slider 下面嘅精選女優 collection。
// 順手由每個 collection 產品標題抽未來場次日期（見面會/攝影會/OFF會）顯示喺卡上。
// 公開 JSON，s-maxage 1 小時。2026-09-14 起。
export const revalidate = 3600;

const SHOP = (process.env.JAVSM_SHOP_ORIGIN || 'https://www.javstarmeet.com').replace(/\/$/, '');

// 首頁 slider 下面 collection 列表嘅顯示次序（同 javstarmeet.com 首頁一致）
const FEATURED = ['唯井真尋', '田野憂', '伊藤舞雪', '松永明里'];

interface RawProduct {
  handle: string;
  title: string;
}

interface Coll {
  id: number;
  title: string;
  handle: string;
  products_count: number;
  image?: { src: string } | null;
}

function hktToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// 「唯井真尋 香港粉絲見面會【 2026年9月20日】」/「（2026年10月3日）」
function parseDate(title: string): string | null {
  const m = title.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!m) return null;
  return `${m[1]}-${Number(m[2]).toString().padStart(2, '0')}-${Number(m[3]).toString().padStart(2, '0')}`;
}

function kindOf(title: string): 'meet' | 'photo' | 'off' | null {
  if (/OFF\s*會/i.test(title)) return 'off';
  if (/見面會/.test(title)) return 'meet';
  if (/攝影會|攝影見面會|快閃/.test(title)) return 'photo';
  return null;
}

async function fetchProducts(handle: string): Promise<RawProduct[]> {
  const out: RawProduct[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`${SHOP}/collections/${encodeURIComponent(handle)}/products.json?limit=250&page=${page}`, {
      next: { revalidate: 3600 },
    });
    if (!r.ok) break;
    const ps: RawProduct[] = (await r.json())?.products ?? [];
    out.push(...ps);
    if (ps.length < 250) break;
  }
  return out;
}

export async function GET() {
  try {
    const r = await fetch(`${SHOP}/collections.json?limit=250`, { next: { revalidate: 3600 } });
    const all: Coll[] = (await r.json())?.collections ?? [];
    const byTitle = new Map(all.map((c) => [c.title, c]));

    const today = hktToday();

    const collections = await Promise.all(
      FEATURED.map(async (name) => {
        const c = byTitle.get(name);
        if (!c) return null;

        // 未來場次（日期+種類去重）
        const dates = new Set<string>();
        const dateKinds: Record<string, Set<string>> = {};
        for (const p of await fetchProducts(c.handle)) {
          const d = parseDate(p.title);
          const k = kindOf(p.title);
          if (!d || !k || d < today) continue;
          dates.add(d);
          (dateKinds[d] ??= new Set()).add(k);
        }
        const upcoming = [...dates].sort().map((d) => ({
          date: d,
          kinds: [...(dateKinds[d] || [])],
        }));

        return {
          title: c.title,
          handle: c.handle,
          url: `${SHOP}/collections/${encodeURIComponent(c.handle)}`,
          image: c.image?.src ?? null,
          productsCount: c.products_count,
          upcoming,
        };
      })
    );

    const items = collections.filter(Boolean);

    return NextResponse.json(
      { ok: true, items, shop: SHOP, serverDate: today },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, items: [], shop: SHOP },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  }
}
