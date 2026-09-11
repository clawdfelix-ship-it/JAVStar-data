import type { Metadata } from 'next';
import AdminClient from './AdminClient';

export const metadata: Metadata = {
  title: '活動補充審批｜J-STAR CALENDAR',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminClient />;
}
