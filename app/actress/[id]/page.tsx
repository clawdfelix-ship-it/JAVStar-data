import { notFound } from 'next/navigation';
import ActressClient from './ActressClient';

// 服務端數據獲取
async function fetchActressServer(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Server fetch error:', error);
    // 開發環境兜底返回數據
    if (process.env.NODE_ENV === 'development') {
      return {
        actress: {
          id,
          name_ja: '河北彩伽',
          name_cn: '河北彩花',
          avatar_url: null,
          birthday: '1998-03-15',
          age: 28,
          zodiac: 'うお座',
          height: '158',
          bust: '85',
          waist: '58',
          hip: '86',
          cup: 'E',
          agency: 'C-more Entertainment',
          hobby: '料理・映画鑑賞',
          debut_year: 2021,
          debut_work: '河北彩伽 デビュー作品',
          blog: null,
          official_site: null,
          tags: '熟女,美巨尻,スレンダー',
          stats: {
            total_events: 47,
            year_2026_events: 23,
            upcoming_events: 2,
          },
          vote_count: 128,
        },
        events: [],
        _matchingValidation: null,
      };
    }
    return null;
  }
}

// 動態 Metadata (SEO) - Next.js 15: params 是 Promise
export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await fetchActressServer(params.id);
  
  if (!data || !data.actress) {
    return {
      title: '女優未找到 | AV Intelligence',
      description: '該女優不存在或已被刪除',
    };
  }

  const actress = data.actress;
  const title = `${actress.name_ja}${actress.name_cn ? `（${actress.name_cn}）` : ''} - 活動記錄 | AV Intelligence`;
  
  const eventsInfo = actress.stats?.total_events 
    ? `${actress.stats.total_events}個活動${actress.stats.year_2026_events ? `，2026年${actress.stats.year_2026_events}個` : ''}`
    : '';
  
  const description = [
    actress.name_ja,
    actress.name_cn,
    actress.age ? `${actress.age}歲` : null,
    actress.debut_year ? `${actress.debut_year}年出道` : null,
    eventsInfo,
    '香港粉絲優先！整合 minnano-av.com 同 av-event.jp 資料'
  ].filter(Boolean).join(' | ');

  const keywords = [
    actress.name_ja,
    actress.name_cn || '',
    'AV 女優',
    'AV女優',
    '日本女優',
    'AV 活動',
    'サイン会',
    actress.tags || ''
  ].filter(Boolean).join(', ');

  return {
    title,
    description,
    keywords,
    openGraph: {
      type: 'profile',
      locale: 'ja_JP',
      alternateLocale: ['zh_HK', 'zh_TW'],
      url: `https://jav-star-data.vercel.app/actress/${params.id}`,
      siteName: 'AV Intelligence｜日本 AV 女優情報平台',
      title,
      description,
      images: actress.avatar_url ? [
        {
          url: actress.avatar_url,
          width: 600,
          height: 600,
          alt: actress.name_ja,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: actress.avatar_url ? [actress.avatar_url] : [],
    },
    alternates: {
      canonical: `https://jav-star-data.vercel.app/actress/${params.id}`,
    },
  };
}

// 服務端頁面組件 - Next.js 15: params 是 Promise
export default async function ActressPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await fetchActressServer(params.id);

  if (!data) {
    notFound();
  }

  // 把數據傳給客戶端組件處理互動
  return <ActressClient initialData={data} actressId={params.id} />;
}
