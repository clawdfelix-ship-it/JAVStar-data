'use client';

import { usePathname } from 'next/navigation';
import AgeGate from '@/components/AgeGate';
import BottomNav from '@/components/BottomNav';
import EventBanner from '@/components/EventBanner';
import SiteFooter from '@/components/SiteFooter';
import TopNav from '@/components/TopNav';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/promo') return <>{children}</>;
  return (
    <>
      <AgeGate />
      <TopNav />
      <EventBanner />
      {children}
      <SiteFooter />
      <BottomNav />
    </>
  );
}
