import HomeClient from './HomeClient';

// 首頁 SEO Metadata
export const metadata = {
  title: {
    default: 'J-STAR CALENDAR｜日本女優活動情報平台 🇭🇰',
    template: '%s | J-STAR CALENDAR',
  },
  description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。一站式追蹤心儀女優嘅最新活動、見面會、攝影會情報。',
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
  authors: [{ name: 'J-STAR CALENDAR' }],
  creator: 'J-STAR CALENDAR',
  publisher: 'J-STAR CALENDAR',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    alternateLocale: ['zh_HK', 'zh_TW'],
    url: 'https://jav-star-data.vercel.app',
    siteName: 'J-STAR CALENDAR｜日本女優活動情報平台',
    title: 'J-STAR CALENDAR｜日本女優活動情報平台 🇭🇰',
    description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。',
    images: [
      {
        url: 'https://jav-star-data.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'J-STAR CALENDAR - 日本女優活動情報平台',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'J-STAR CALENDAR｜日本女優活動情報平台 🇭🇰',
    description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。',
    images: ['https://jav-star-data.vercel.app/og-image.png'],
  },
  alternates: {
    canonical: 'https://jav-star-data.vercel.app',
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
  "name": "J-STAR CALENDAR",
  "alternateName": "JAVStar-data",
  "url": "https://jav-star-data.vercel.app",
  "description": "星動行程追蹤平台，一站式追蹤心儀女優嘅最新活動、見面會、攝影會情報",
  "publisher": {
    "@type": "Organization",
    "name": "J-STAR CALENDAR",
    "logo": {
      "@type": "ImageObject",
      "url": "https://jav-star-data.vercel.app/logo.png"
    }
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://jav-star-data.vercel.app/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

// 服務端頁面組件
export default async function HomePage() {
  // 服務端預取數據（可選，用於提升首屏速度）
  // 這裡留空，讓客戶端處理所有數據獲取和互動
  // 未來可以在這裡加入服務端渲染的初始數據

  return (
    <>
      {/* JSON-LD 結構化數據 (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
