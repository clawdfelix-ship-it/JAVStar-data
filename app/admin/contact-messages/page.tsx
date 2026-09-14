import type { Metadata } from 'next';
import ContactAdminClient from './AdminClient';

export const metadata: Metadata = {
  title: '合作查詢｜JCHING CALENDAR',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ContactAdminClient />;
}
