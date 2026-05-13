import HomeClient from './HomeClient';

// 首頁 SEO Metadata
export const metadata = {
  title: {
    default: 'AV Intelligence｜日本 AV 女優情報平台 🇭🇰',
    template: '%s | AV Intelligence',
  },
  description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。一站式追蹤心儀女優嘅最新活動、見面會、攝影會情報。',
  keywords: [
    'AV 女優',
    'AV女優',
    '日本女優',
    'AV 活動',
    'サイン会',
    '見面會',
    '攝影會',
    'minnano-av',
    'av-event.jp',
    '香港 AV 情報',
    'AV 情報平台',
    '日本 AV 情報',
  ],
  authors: [{ name: 'AV Intelligence' }],
  creator: 'AV Intelligence',
  publisher: 'AV Intelligence',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    alternateLocale: ['zh_HK', 'zh_TW'],
    url: 'https://jav-star-data.vercel.app',
    siteName: 'AV Intelligence｜日本 AV 女優情報平台',
    title: 'AV Intelligence｜日本 AV 女優情報平台 🇭🇰',
    description: '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名。',
    images: [
      {
        url: 'https://jav-star-data.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AV Intelligence - 日本 AV 女優情報平台',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AV Intelligence｜日本 AV 女優情報平台 🇭🇰',
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
  "name": "AV Intelligence",
  "alternateName": "JAVStar-data",
  "url": "https://jav-star-data.vercel.app",
  "description": "日本 AV 女優活動情報平台，一站式追蹤心儀女優嘅最新活動、見面會、攝影會情報",
  "publisher": {
    "@type": "Organization",
    "name": "AV Intelligence",
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
