import type { Metadata } from 'next';
import './globals.css';
import EventBanner from '@/components/EventBanner';
import BottomNav from '@/components/BottomNav';
import AgeGate from '@/components/AgeGate';

export const metadata: Metadata = {
  title: 'J-STAR CALENDAR｜日本女優活動情報平台 🇭🇰',
  description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'J-STAR',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased font-japanese bg-bg-secondary">
        <AgeGate />
        <EventBanner />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
