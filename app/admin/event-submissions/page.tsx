import type { Metadata } from 'next';
import EventSubmissionsAstryxPanel from './EventSubmissionsAstryxPanel';

export const metadata: Metadata = {
  title: '活動補充審批｜JCHING CALENDAR',
  robots: { index: false, follow: false },
};

// Live event-submissions route now uses the Astryx implementation.
// Previous Tailwind client retained as AdminClient.tsx.bak for rollback.
export default function Page() {
  return <EventSubmissionsAstryxPanel />;
}
