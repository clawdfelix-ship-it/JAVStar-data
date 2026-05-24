import type { Metadata } from 'next';
import EventsClient from './EventsClient';

export const metadata: Metadata = {
  title: '活動列表 | AV Intelligence',
  description: '未來30日日本 AV 女優活動日程，包括簽名會、座談會、實體活動等',
};

export default async function EventsPage() {
  return <EventsClient />;
}