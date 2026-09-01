import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import ActressClient from './ActressClient';

// 服務端直接查詢數據庫 (更快、更穩定、唔依賴環境變數)
async function fetchActressServer(id: string) {
  try {
    // 1. 查詢女優基本資料
    const actresses = await sql`
      SELECT * FROM actresses WHERE id = ${id} LIMIT 1
    `;
    
    if (!actresses || (actresses as any[]).length === 0) {
      return null;
    }
    
    const actress = (actresses as any[])[0];
    
    // 2. 查詢女優嘅活動。排序用 normalize 咗嘅 date_iso（DATE），唔好用 raw
    //    datetime 文本——入面有全形數字（２０２６）同垃圾值，UTF-8 排序亂、
    //    new Date() 又會變 1970。
    const events = await sql`
      SELECT * FROM events
      WHERE actress_id = ${id}
      ORDER BY date_iso DESC NULLS LAST
    `;

    // 3. 計算統計數據。日期一律以 date_iso（YYYY-MM-DD）做字串比較。
    const eventList = (events as any[]).map(e => {
      const iso = e.date_iso ? new Date(e.date_iso).toISOString().slice(0, 10) : '';
      return { ...e, datetime: iso || e.datetime, date_iso: iso || null };
    });
    const todayStr = new Date().toISOString().slice(0, 10);
    const year2026Events = eventList.filter(e => (e.date_iso || '').slice(0, 4) === '2026').length;
    const upcomingEvents = eventList.filter(e => (e.date_iso || '') >= todayStr).length;
    
    // 4. 查詢投票數
    const votes = await sql`
      SELECT COUNT(*) as count FROM votes WHERE actress_id = ${id}
    `;
    
    return {
      actress: {
        ...actress,
        stats: {
          total_events: eventList.length,
          year_2026_events: year2026Events,
          month_04_2026_events: year2026Events, // 兼容舊字段
          upcoming_events: upcomingEvents,
        },
        vote_count: Number((votes as any[])[0]?.count || 0),
      },
      events: eventList,
      _matchingValidation: null,
    };
  } catch (error) {
    console.error('Server DB query error:', error);
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
