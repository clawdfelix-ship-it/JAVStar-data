'use client';

import { Hammer, ArrowRight, Sparkles } from 'lucide-react';

// 拍賣平台廣告位（女優排名 ↔ 每月新作中間）
// 連結可由 NEXT_PUBLIC_AUCTION_URL 覆蓋，預設走正式 Vercel 網址
const AUCTION_URL =
  process.env.NEXT_PUBLIC_AUCTION_URL || 'https://auction-website-tan.vercel.app';

export default function AuctionPromoBanner() {
  return (
    <section className="px-4 py-8 md:py-10">
      <div className="max-w-7xl mx-auto">
        <a
          href={AUCTION_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group relative block overflow-hidden rounded-3xl border border-[rgba(var(--color-nadeshiko),0.35)] shadow-xl shadow-pink-200/40"
        >
          {/* 底色：和風漸層 */}
          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--color-wine))] via-[rgb(var(--color-nadeshiko-strong))] to-[rgb(var(--color-nadeshiko-dark))]" />
          {/* 裝飾光斑 */}
          <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-8 -bottom-20 w-64 h-64 rounded-full bg-[rgba(var(--color-gold),0.25)] blur-2xl" />

          <div className="relative px-6 py-8 md:px-12 md:py-10 flex flex-col md:flex-row md:items-center gap-6">
            {/* 左：icon + 文案 */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
                <Hammer className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[rgb(var(--color-wine))] bg-[rgb(var(--color-gold))] px-2 py-0.5 rounded-full mb-2">
                  <Sparkles className="w-3 h-3" />
                  官方周邊拍賣
                </div>
                <h3 className="text-white text-lg md:text-2xl font-black leading-tight">
                  J-STAR 偶像周邊拍賣
                </h3>
                <p className="text-pink-100 text-xs md:text-sm mt-1 leading-relaxed">
                  拍立得・簽名・絕版週邊轮番上架｜填最高預算，系統幫你自動出價，唔使守尾場
                </p>
              </div>
            </div>

            {/* 右：CTA */}
            <div className="shrink-0 flex items-center gap-3 md:flex-col md:items-end">
              <span className="inline-flex items-center gap-2 bg-white text-[rgb(var(--color-wine))] font-bold text-sm md:text-base px-6 py-3 rounded-xl shadow-lg transition-transform group-hover:scale-105">
                入場競投
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="text-pink-100/80 text-[11px]">每週新場次 · FPS 過數 · 順豐到付</span>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
