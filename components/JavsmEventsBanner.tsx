'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';

// JavStarMeet 首頁 slider 廣告贊助（訂閱通知下面）
// 經 /api/javsm-events 鏡像對方首頁頂部 banner，2026-09-14 起
const SHOP_URL = process.env.NEXT_PUBLIC_JAVSM_URL || 'https://www.javstarmeet.com';

interface Slide {
  imageDesktop: string;
  imageMobile: string;
  url: string;
}
interface Resp {
  ok: boolean;
  slides: Slide[];
  shop: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function JavsmEventsBanner() {
  const { data } = useSWR<Resp>('/api/javsm-events', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const slides = data?.ok ? data.slides : [];
  const shop = data?.shop || SHOP_URL;
  const [idx, setIdx] = useState(0);

  // 自動輪播 5 秒一張
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  // 未載入唔佔位；冇圖／失敗收埋
  if (!data || slides.length === 0) return null;

  return (
    <div className="mt-4 max-w-xl mx-auto">
      <div
        className="rounded-2xl p-4 md:p-5 border bg-white"
        style={{ borderColor: 'rgba(var(--color-sakura-gray),0.6)' }}
      >
        <div className="flex items-end justify-between gap-3 mb-2.5">
          <h3 className="text-sm md:text-base font-bold text-text-primary flex items-center gap-2">
            🇭🇰 JavStarMeet 香港活動
            <span className="text-[10px] md:text-[11px] font-normal text-text-tertiary">廣告贊助</span>
          </h3>
          <a
            href={shop}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--color-nadeshiko-dark))] hover:gap-1.5 transition-all"
          >
            入場 <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-[rgba(var(--color-sakura-gray),0.7)]">
          <a
            href={shop}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block relative aspect-[3/1] bg-[rgba(var(--color-sakura-gray),0.25)]"
          >
            {slides.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.imageDesktop}
                srcSet={`${s.imageMobile} 750w, ${s.imageDesktop} 1600w`}
                sizes="(max-width: 640px) 100vw, 576px"
                src={s.imageDesktop}
                alt="JavStarMeet 香港粉絲活動"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                style={{ opacity: i === idx ? 1 : 0 }}
              />
            ))}
          </a>

          {slides.length > 1 && (
            <div className="absolute bottom-1.5 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
              {slides.map((s, i) => (
                <button
                  key={s.imageDesktop}
                  type="button"
                  aria-label={`第 ${i + 1} 張`}
                  onClick={() => setIdx(i)}
                  className={`pointer-events-auto w-1.5 h-1.5 rounded-full transition-colors ${
                    i === idx ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
