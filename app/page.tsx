import HomeClient from './HomeClient';
import { fetchTopActressesForSSR } from '@/lib/server-actresses';

// 首頁 SEO Metadata
export const metadata = {
  title: {
    default: 'JCHING CALENDAR｜追星平台 🇭🇰',
    template: '%s | JCHING CALENDAR',
  },
  description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。追星平台 - 一站式追蹤心儀女優嘅最新日港台活動情報。',
  keywords: [
    '女優',
    '女優',
    '日本女優',
    'AV 活動',
    'サイン会',
    '見面會',
    '攝影會',
    'minnano-av',
    'av-event.jp',
    '香港 AV 情報',
    'AV 情報平台',
    '日本活動情報',
  ],
  authors: [{ name: 'JCHING CALENDAR' }],
  creator: 'JCHING CALENDAR',
  publisher: 'JCHING CALENDAR',
  openGraph: {
    type: 'website',
    locale: 'zh_HK',
    alternateLocale: ['zh_TW', 'ja_JP'],
    url: 'https://www.jching-calendar.com',
    siteName: 'JCHING CALENDAR｜追星平台',
    title: 'JCHING CALENDAR｜追星平台 🇭🇰',
    description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。',
    images: [
      {
        url: 'https://www.jching-calendar.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'JCHING CALENDAR - 追星平台',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JCHING CALENDAR｜追星平台 🇭🇰',
    description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。',
    images: ['https://www.jching-calendar.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://www.jching-calendar.com',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
};

// JSON-LD 結構化數據 (WebSite + Organization)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "JCHING CALENDAR",
  "alternateName": "JAVStar-data",
  "url": "https://www.jching-calendar.com",
  "description": "追星平台 - 一站式追蹤心儀女優嘅最新日港台活動情報",
  "publisher": {
    "@type": "Organization",
    "name": "JCHING CALENDAR",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.jching-calendar.com/logo.png"
    }
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.jching-calendar.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

// 服務端頁面組件
export default async function HomePage() {
  // SSR 預取預設排名（hk_upcoming）第一頁，令唔執行 JS 嘅爬蟲／AI 都讀到女優名＋連結
  let initialActresses: Awaited<ReturnType<typeof fetchTopActressesForSSR>> = [];
  try {
    initialActresses = await fetchTopActressesForSSR(10);
  } catch (e) {
    console.error('SSR top actresses fetch failed:', e);
  }

  return (
    <>
      {/* JSON-LD 結構化數據 (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient initialActresses={initialActresses} />
    </>
  );
}
