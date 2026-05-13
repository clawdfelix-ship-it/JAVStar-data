import type { Metadata } from 'next';

export interface ActressSEOData {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  stats?: {
    total_events: number;
    year_2026_events: number;
  };
  tags?: string | null;
  age?: number | null;
  debut_year?: number | null;
}

export interface EventSEOData {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
}

const SITE_NAME = 'AV Intelligence｜日本 AV 女優情報平台';
const SITE_URL = 'https://jav-star-data.vercel.app';
const DEFAULT_DESCRIPTION = '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料，按活動數量排名';

/**
 * 女優詳情頁 SEO Metadata
 */
export function generateActressMetadata(actress: ActressSEOData): Metadata {
  const title = `${actress.name_ja}${actress.name_cn ? `（${actress.name_cn}）` : ''} - AV Intelligence`;
  
  const eventsInfo = actress.stats?.total_events 
    ? `${actress.stats.total_events}個活動${actress.stats.year_2026_events ? `，2026年${actress.stats.year_2026_events}個` : ''}`
    : '';
  
  const description = [
    actress.name_ja,
    actress.name_cn,
    actress.age ? `${actress.age}歲` : null,
    actress.debut_year ? `${actress.debut_year}年出道` : null,
    eventsInfo,
    DEFAULT_DESCRIPTION
  ].filter(Boolean).join(' | ');

  const images = actress.avatar_url ? [
    {
      url: actress.avatar_url,
      width: 600,
      height: 600,
      alt: actress.name_ja,
    }
  ] : [];

  return {
    title,
    description,
    keywords: generateKeywords(actress),
    authors: [{ name: 'AV Intelligence' }],
    creator: 'AV Intelligence',
    publisher: 'AV Intelligence',
    openGraph: {
      type: 'profile',
      locale: 'ja_JP',
      alternateLocale: ['zh_HK', 'zh_TW'],
      url: `${SITE_URL}/actress/${actress.id}`,
      siteName: SITE_NAME,
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@av_intelligence',
      creator: '@av_intelligence',
      title,
      description,
      images: actress.avatar_url ? [actress.avatar_url] : [],
    },
    alternates: {
      canonical: `${SITE_URL}/actress/${actress.id}`,
    },
    other: {
      // Google 結構化數據在頁面內單獨渲染
    },
  };
}

/**
 * 首頁 SEO Metadata
 */
export function generateHomeMetadata(): Metadata {
  return {
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: [
      'AV 女優',
      'AV女優',
      '日本女優',
      'AV 活動',
      'サイン会',
      'minnano-av',
      'av-event.jp',
      '香港 AV 情報',
      'AV 情報平台',
    ],
    authors: [{ name: 'AV Intelligence' }],
    creator: 'AV Intelligence',
    publisher: 'AV Intelligence',
    openGraph: {
      type: 'website',
      locale: 'ja_JP',
      alternateLocale: ['zh_HK', 'zh_TW'],
      url: SITE_URL,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'AV Intelligence - 日本 AV 女優情報平台',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@av_intelligence',
      creator: '@av_intelligence',
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

/**
 * 生成關鍵字
 */
function generateKeywords(actress: ActressSEOData): string[] {
  const base = [
    actress.name_ja,
    actress.name_cn || '',
    'AV 女優',
    'AV女優',
    '日本女優',
    'AV 活動',
    'サイン会',
  ].filter(Boolean);

  if (actress.tags) {
    base.push(...actress.tags.split(',').map(t => t.trim()));
  }

  return base;
}

/**
 * 生成 JSON-LD 結構化數據 (Person)
 */
export function generateActressJsonLd(actress: ActressSEOData) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": actress.name_ja,
    "alternateName": actress.name_cn || undefined,
    "image": actress.avatar_url || undefined,
    "url": `${SITE_URL}/actress/${actress.id}`,
    "jobTitle": "AV Actress",
    "birthDate": actress.age ? undefined : undefined,
    "description": `${actress.name_ja} - 日本 AV 女優，${actress.stats?.total_events || 0}個活動記錄`,
    "keywords": generateKeywords(actress).join(', '),
  };
}
