'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Hammer, ArrowRight, Flame, Clock } from 'lucide-react';

// 拍賣平台「正在拍賣」廣告位（女優排名 ↔ 每月新作中間）
// 經本站 /api/auction-live proxy 拉 flash-bids.com 嘅 active 貨品（2026-09-11 起）
const AUCTION_URL =
  process.env.NEXT_PUBLIC_AUCTION_URL || 'https://flash-bids.com';

interface LiveLot {
  id: string;
  title: string;
  idolName: string | null;
  category: string | null;
  coverUrl: string | null;
  lotUrl: string;
  price: number; // cents
  bidCount: number;
  endTime: number; // epoch ms
}

interface LiveResp {
  ok: boolean;
  items: LiveLot[];
  serverNow: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmtMoney(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString('zh-HK')}`;
}

function useTick(active: boolean) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

function Countdown({ endTime, serverNow }: { endTime: number; serverNow: number }) {
  useTick(true);
  // 用 serverNow 做基準＋本機流逝，避免依賴用戶時鐘
  const offset = serverNow - Date.now();
  const ms = Math.max(0, endTime - (Date.now() + offset));
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const urgent = ms < 10 * 60 * 1000;
  const text = d > 0 ? `${d}日${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${
        urgent ? 'text-red-600' : 'text-[rgb(var(--color-umenezumi-light))]'
      }`}
    >
      <Clock className="w-3 h-3" />
      {text}
    </span>
  );
}

function LotCard({ lot, serverNow }: { lot: LiveLot; serverNow: number }) {
  return (
    <a
      href={lot.lotUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block snap-start shrink-0 w-36 sm:w-44 bg-white rounded-2xl border border-[rgba(var(--color-sakura-gray),0.7)] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[3/4] bg-[rgba(var(--color-sakura-gray),0.25)] overflow-hidden">
        {lot.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lot.coverUrl}
            alt={lot.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">🏮</div>
        )}
        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-black/55 backdrop-blur px-1.5 py-0.5 rounded-full">
          <Flame className="w-3 h-3 text-orange-400" />
          拍賣中
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-[13px] font-bold text-text-primary leading-snug line-clamp-2 min-h-[2.4em]">
          {lot.title}
        </p>
        {lot.category ? (
          <p className="text-[11px] text-pink-600 mt-0.5 truncate">{lot.category}</p>
        ) : null}
        <div className="flex items-end justify-between gap-1 mt-1.5">
          <div>
            <p className="text-[10px] text-text-tertiary leading-none mb-0.5">現價</p>
            <p className="text-sm font-black text-[rgb(var(--color-nadeshiko-strong))] leading-none">
              {fmtMoney(lot.price)}
            </p>
          </div>
          <span className="text-[10px] text-text-tertiary shrink-0">{lot.bidCount} 口</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-[rgba(var(--color-sakura-gray),0.5)]">
          <Countdown endTime={lot.endTime} serverNow={serverNow} />
        </div>
      </div>
    </a>
  );
}

// 冇直播貨時嘅靜態 fallback banner
function StaticBanner() {
  return (
    <a
      href={AUCTION_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group relative block overflow-hidden rounded-3xl border border-[rgba(var(--color-nadeshiko),0.35)] shadow-xl shadow-pink-200/40"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--color-wine))] via-[rgb(var(--color-nadeshiko-strong))] to-[rgb(var(--color-nadeshiko-dark))]" />
      <div className="relative px-6 py-7 md:px-10 md:py-8 flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center ring-1 ring-white/25">
          <Hammer className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-base md:text-xl font-black">Flash Bids 即時拍賣</h3>
          <p className="text-pink-100 text-xs mt-0.5">拍立得・寫真・偶像周邊｜自動出價，唔使守尾場</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 bg-white text-[rgb(var(--color-wine))] font-bold text-sm px-4 py-2.5 rounded-xl group-hover:scale-105 transition-transform">
          入場 <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </a>
  );
}

export default function AuctionPromoBanner() {
  const { data } = useSWR<LiveResp>('/api/auction-live', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const items = data?.ok ? data.items.slice(0, 20) : [];
  const serverNow = data?.serverNow ?? Date.now();

  // 未載入時唔佔位避免跳版；載入失敗/冇貨先用靜態 banner
  if (!data) return null;
  if (items.length === 0) {
    return (
      <section className="px-4 py-8 md:py-10">
        <div className="max-w-7xl mx-auto">
          <StaticBanner />
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* 標題列 */}
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-xl md:text-2xl">⚡</span>
              正在拍賣
              <a
                href={AUCTION_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-[10px] md:text-xs font-semibold text-white bg-[rgb(var(--color-nadeshiko-strong))] px-2 py-0.5 rounded-full"
              >
                FLASH BIDS
              </a>
            </h2>
            <p className="text-text-tertiary mt-0.5 text-xs">偶像周邊實時競投 • 即刻入 flash-bids.com 出價</p>
          </div>
          <a
            href={AUCTION_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="shrink-0 inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-[rgb(var(--color-nadeshiko-dark))] hover:gap-2 transition-all"
          >
            睇全部 <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* 產品橫排（手機可橫滑，桌面一排過） */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory [scrollbar-width:thin]">
          {items.map((lot) => (
            <LotCard key={lot.id} lot={lot} serverNow={serverNow} />
          ))}
        </div>
      </div>
    </section>
  );
}
