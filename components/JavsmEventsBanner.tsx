'use client';

import useSWR from 'swr';
import { ArrowRight, MapPin, CalendarDays } from 'lucide-react';

// JavStarMeet 首頁 slider 下面嘅精選女優 collection（廣告贊助，訂閱通知下面）
// 經 /api/javsm-events proxy 拉 Shopify collections，2026-09-14 起
const SHOP_URL = process.env.NEXT_PUBLIC_JAVSM_URL || 'https://www.javstarmeet.com';

interface Upcoming {
  date: string; // YYYY-MM-DD
  kinds: ('meet' | 'photo' | 'off')[];
}
interface Collection {
  title: string;
  handle: string;
  url: string;
  image: string | null;
  productsCount: number;
  upcoming: Upcoming[];
}
interface Resp {
  ok: boolean;
  items: Collection[];
  shop: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const KIND_ZH: Record<string, string> = { meet: '見面會', photo: '攝影會', off: 'OFF會' };

function fmt(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}（${WD[new Date(y, m - 1, d).getDay()]}）`;
}

// 每張卡最多顯示兩個未來場次
function dateLine(up: Upcoming[]) {
  if (up.length === 0) return null;
  const show = up.slice(0, 2);
  return show
    .map((u) => {
      const tag = u.kinds.includes('meet')
        ? '見面會'
        : u.kinds.includes('photo')
          ? '攝影會'
          : u.kinds.includes('off')
            ? 'OFF會'
            : '';
      return `${fmt(u.date)}${tag ? ' ' + tag : ''}`;
    })
    .join(' · ') + (up.length > 2 ? ` 等${up.length}場` : '');
}

export default function JavsmEventsBanner() {
  const { data } = useSWR<Resp>('/api/javsm-events', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const items = data?.ok ? data.items : [];
  const shop = data?.shop || SHOP_URL;

  // 未載入唔佔位；冇貨／失敗收埋
  if (!data || items.length === 0) return null;

  return (
    <div className="mt-4 max-w-xl mx-auto">
      <div
        className="rounded-2xl p-5 md:p-6 border bg-white"
        style={{ borderColor: 'rgba(var(--color-sakura-gray),0.6)' }}
      >
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-text-primary flex items-center gap-2">
              <span className="text-pink-500">
                <MapPin className="w-4 h-4" />
              </span>
              🇭🇰 香港粉絲活動
              <span className="text-[10px] md:text-[11px] font-normal text-text-tertiary">廣告贊助</span>
            </h3>
            <p className="text-xs text-text-tertiary mt-1">見面會・攝影會・OFF 會門票</p>
          </div>
          <a
            href={`${shop}/collections/見面會`}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--color-nadeshiko-dark))] hover:gap-1.5 transition-all"
          >
            全部 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {items.map((c) => {
            const dl = dateLine(c.upcoming);
            return (
              <a
                key={c.handle}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group relative rounded-xl border border-[rgba(var(--color-sakura-gray),0.7)] overflow-hidden bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="relative aspect-[4/3] bg-[rgba(var(--color-sakura-gray),0.25)] overflow-hidden">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image}
                      alt={c.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : null}
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-black/55 backdrop-blur px-1.5 py-0.5 rounded-full">
                    {c.productsCount} 件商品
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-[13px] font-bold text-text-primary leading-tight truncate">{c.title}</p>
                  {dl ? (
                    <p className="text-[10.5px] text-[rgb(var(--color-nadeshiko-dark))] font-semibold flex items-start gap-0.5 mt-1 leading-snug">
                      <CalendarDays className="w-3 h-3 mt-px shrink-0" />
                      <span className="truncate">{dl}</span>
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-text-tertiary mt-1">活動商品</p>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        <a
          href={shop}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl bg-[rgb(var(--color-nadeshiko-strong))] text-white text-sm font-bold py-2.5 hover:opacity-90 transition-opacity"
        >
          到 JavStarMeet 購票 <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
