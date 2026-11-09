'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import InstagramIcon, { JCHING_INSTAGRAM_URL } from './InstagramIcon';

// 全站 footer：以前法律頁連結只喺 AgeGate 入面，confirm 後全站搵唔到
// （2026-09-10 審計 P2）。桌面/手機都顯示；手機內容要留 bottom-nav 空間。
// 首頁由 HomeClient 自己渲染更豐富嘅完整 footer（含數據來源/更新時間/法律連結），
// 所以喺首頁隱藏呢個全域 footer，避免兩個 footer 疊住（2026-09-27 audit P2）。
export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <footer className="mt-12 border-t border-border bg-white/60">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 pb-24 md:pb-8">
        <p className="text-xs text-text-tertiary text-center md:text-left">
          © {new Date().getFullYear()} JCHING CALENDAR · 僅供年滿 18 歲人士 · 活動情報以主辦方公布為準
        </p>
        <nav aria-label="法律連結" className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 text-xs text-text-secondary">
          <a
            href={JCHING_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--color-nadeshiko),0.35)] bg-[rgba(var(--color-sakura),0.55)] px-3 py-1.5 font-bold text-[rgb(var(--color-nadeshiko-dark))] transition-colors hover:text-[rgb(var(--color-wine))]"
          >
            <InstagramIcon className="h-3.5 w-3.5" />
            @jching.calendar
          </a>
          <span aria-hidden className="text-text-tertiary">·</span>
          <Link href="/contact" className="font-semibold text-[rgb(var(--color-nadeshiko-dark))] hover:text-[rgb(var(--color-wine))] transition-colors">廣告查詢 / 合作</Link>
          <span aria-hidden className="text-text-tertiary">·</span>
          <Link href="/terms" className="hover:text-[rgb(var(--color-wine))] transition-colors">使用條款</Link>
          <span aria-hidden className="text-text-tertiary">·</span>
          <Link href="/privacy" className="hover:text-[rgb(var(--color-wine))] transition-colors">私隱政策</Link>
        </nav>
      </div>
    </footer>
  );
}
