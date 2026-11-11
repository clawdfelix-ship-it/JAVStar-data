'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, GitCompareArrows, Newspaper, Mail } from 'lucide-react';

const items = [
  { href: '/', label: '首頁', icon: Home, match: (p: string) => p === '/' },
  { href: '/events', label: '活動', icon: CalendarDays, match: (p: string) => p.startsWith('/events') },
  { href: '/news', label: '情報', icon: Newspaper, match: (p: string) => p.startsWith('/news') },
  { href: '/compare', label: '比較', icon: GitCompareArrows, match: (p: string) => p.startsWith('/compare') },
];

export default function BottomNav() {
  const pathname = usePathname() || '/';

  // 撳「報料」：喺現有頁搵摺合表單，展開＋滾到位；搵唔到先跳去首頁。
  function openReport() {
    const btn = document.querySelector<HTMLButtonElement>('button[aria-expanded]');
    if (btn) {
      if (btn.getAttribute('aria-expanded') !== 'true') btn.click();
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.location.href = '/#report';
    }
  }

  return (
    <nav
      aria-label="底部導航"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-white/85 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
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

        <button
          type="button"
          onClick={openReport}
          className="flex flex-col items-center justify-center gap-0.5 min-h-[52px] py-1.5 text-[11px] font-medium text-[rgb(var(--color-nadeshiko-dark))] transition-colors active:text-[rgb(var(--color-wine))]"
          aria-label="報料：補充未收錄活動"
        >
          <Mail className="w-5 h-5" />
          報料
        </button>
      </div>
    </nav>
  );
}
