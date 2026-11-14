import type { Metadata } from 'next';
import FansAstryxPanel from './FansAstryxPanel';

export const metadata: Metadata = {
  title: '追蹤名單｜JCHING CALENDAR',
  robots: { index: false, follow: false },
};

// Live fans list route now uses the Astryx implementation.
// Previous Tailwind client retained as AdminClient.tsx.bak for rollback.
export default function Page() {
  return <FansAstryxPanel />;
}
