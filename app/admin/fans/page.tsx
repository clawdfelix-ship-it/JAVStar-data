import type { Metadata } from 'next';
import FansAdminClient from './AdminClient';

export const metadata: Metadata = {
  title: '追蹤名單｜JCHING CALENDAR',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FansAdminClient />;
}
