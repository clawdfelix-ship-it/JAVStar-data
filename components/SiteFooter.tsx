import Link from 'next/link';

// 全站 footer：以前法律頁連結只喺 AgeGate 入面，confirm 後全站搵唔到
// （2026-09-10 審計 P2）。桌面/手機都顯示；手機內容要留 bottom-nav 空間。
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-white/60">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 pb-24 md:pb-8">
        <p className="text-xs text-text-tertiary text-center md:text-left">
          © {new Date().getFullYear()} J-STAR CALENDAR · 僅供年滿 18 歲人士 · 活動情報以主辦方公布為準
        </p>
        <nav aria-label="法律連結" className="flex items-center gap-4 text-xs text-text-secondary">
          <Link href="/terms" className="hover:text-[rgb(var(--color-wine))] transition-colors">使用條款</Link>
          <span aria-hidden className="text-text-tertiary">·</span>
          <Link href="/privacy" className="hover:text-[rgb(var(--color-wine))] transition-colors">私隱政策</Link>
        </nav>
      </div>
    </footer>
  );
}
