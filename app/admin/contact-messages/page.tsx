import type { Metadata } from 'next';
import ContactAstryxPanel from './ContactAstryxPanel';

export const metadata: Metadata = {
  title: '合作查詢｜JCHING CALENDAR',
  robots: { index: false, follow: false },
};

// Live contact-messages route now uses the Astryx implementation.
// Previous Tailwind client retained as AdminClient.tsx.bak for rollback.
export default function Page() {
  return <ContactAstryxPanel />;
}
