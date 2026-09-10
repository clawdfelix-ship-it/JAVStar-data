'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

// 桌面版頂欄：手機用 BottomNav（md:hidden），桌面以前冇任何 /events、/compare 入口
// （2026-09-10 響應式一致性審計 P1），呢個頂欄 md 以上先顯示。
const items = [
  { href: '/', label: '首頁', match: (p: string) => p === '/' },
  { href: '/events', label: '活動月曆', match: (p: string) => p.startsWith('/events') },
  { href: '/compare', label: '女優比較', match: (p: string) => p.startsWith('/compare') },
];

export default function TopNav() {
  const pathname = usePathname() || '/';
  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" aria-label="J-STAR CALENDAR 首頁" className="flex items-center gap-2.5 shrink-0">
          <Logo size={34} withText={false} href="" />
          <span className="leading-none">
            <span className="block font-extrabold tracking-tight text-[#2F4053] text-base">J-STAR</span>
            <span className="block font-light tracking-[0.22em] text-[#5b6b7c] text-[9px] mt-0.5">CALENDAR</span>
          </span>
        </Link>

        <nav aria-label="主導航" className="flex items-center gap-1">
          {items.map((it) => {
            const active = it.match(pathname);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[rgba(var(--color-nadeshiko),0.18)] text-[rgb(var(--color-wine))]'
                    : 'text-[rgb(var(--color-umenezumi-light))] hover:bg-[rgba(var(--color-sakura-gray),0.25)] hover:text-[rgb(var(--color-umenezumi))]'
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
