'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, GitCompareArrows } from 'lucide-react';

const items = [
  { href: '/', label: '首頁', icon: Home, match: (p: string) => p === '/' },
  { href: '/events', label: '活動', icon: CalendarDays, match: (p: string) => p.startsWith('/events') },
  { href: '/compare', label: '比較', icon: GitCompareArrows, match: (p: string) => p.startsWith('/compare') },
];

export default function BottomNav() {
  const pathname = usePathname() || '/';
  // 女優詳情頁等深層頁面唔搶焦點，但仍然顯示方便返回
  return (
    <nav
      aria-label="底部導航"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-white/85 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3 max-w-md mx-auto">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-[rgb(var(--color-wine))]'
                  : 'text-[rgb(var(--color-umenezumi-light))]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
