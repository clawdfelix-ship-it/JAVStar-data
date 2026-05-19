import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Cache 配置
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 小時
let cachedData: any = null;
let lastFetchTime = 0;

// GET - 拎排行榜數據
export async function GET() {
  // 檢查 cache
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      data: cachedData,
      cached: true,
    });
  }

  try {
    // 確保表存在
    await sql`
      CREATE TABLE IF NOT EXISTS dvd_ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rank INTEGER NOT NULL,
        video_code TEXT,
        title TEXT,
        actress TEXT,
        maker TEXT,
        cover_url TEXT,
        detail_url TEXT,
        is_new BOOLEAN DEFAULT 0,
        rank_change TEXT DEFAULT 'same',
        source TEXT DEFAULT 'DMM',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 從數據庫拎最新數據
    const rows = await sql`
      SELECT * FROM dvd_ranking ORDER BY rank ASC LIMIT 20
    `;
    
    if (rows.length === 0) {
      // 如果冇數據，返回示例數據
      return NextResponse.json({
        success: true,
        data: getSampleData(),
        note: '使用示例數據',
      });
    }

    // 格式化數據
    const ranking = rows.map((row: any) => ({
      rank: row.rank,
      videoCode: row.video_code,
      title: row.title || '',
      actress: row.actress || '',
      maker: row.maker || '',
      coverUrl: row.cover_url,
      detailUrl: row.detail_url,
      isNew: row.is_new === 1,
      rankChange: row.rank_change || 'same',
    }));

    // 更新 cache
    cachedData = ranking;
    lastFetchTime = now;

    return NextResponse.json({
      success: true,
      data: ranking,
      total: ranking.length,
    });

  } catch (error) {
    console.error('獲取排行榜失敗:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

// POST - 手動更新排行榜
export async function POST(request: Request) {
  try {
    const { ranking, source = 'DMM' } = await request.json();
    
    if (!ranking || !Array.isArray(ranking)) {
      return NextResponse.json({
        success: false,
        error: 'ranking array required',
      }, { status: 400 });
    }

    // 確保表存在
    await sql`
      CREATE TABLE IF NOT EXISTS dvd_ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rank INTEGER NOT NULL,
        video_code TEXT,
        title TEXT,
        actress TEXT,
        maker TEXT,
        cover_url TEXT,
        detail_url TEXT,
        is_new BOOLEAN DEFAULT 0,
        rank_change TEXT DEFAULT 'same',
        source TEXT DEFAULT 'DMM',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 先清空舊數據
    await sql`DELETE FROM dvd_ranking`;
    
    // 插入新數據
    let insertedCount = 0;
    for (const item of ranking) {
      // 從detailUrl提取video code
      const videoCodeMatch = item.detailUrl?.match(/cid=([^/]+)/);
      const videoCode = videoCodeMatch ? videoCodeMatch[1] : (item.videoCode || '');
      
      await sql`
        INSERT INTO dvd_ranking 
        (rank, video_code, title, actress, maker, cover_url, detail_url, is_new, rank_change, source)
        VALUES (
          ${item.rank}, 
          ${videoCode}, 
          ${item.title || ''}, 
          ${item.actress || ''}, 
          ${item.maker || ''}, 
          ${item.coverUrl || item.cover_url || ''}, 
          ${item.detailUrl || item.detail_url || ''}, 
          ${item.isNew || item.is_new ? 1 : 0}, 
          ${item.rankChange || item.rank_change || 'same'}, 
          ${source}
        )
      `;
      insertedCount++;
    }

    // 清除 cache
    cachedData = null;

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      message: '排行榜更新成功',
    });

  } catch (error) {
    console.error('更新排行榜失敗:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

// 示例數據
function getSampleData() {
  return [
    {
      rank: 1,
      title: '最強ヒロインと 一緒に終電逃して ホテル泊まって 朝までヤリたい！ 瀬戸環奈',
      actress: '瀬戸環奈',
      maker: 'エスワン',
      coverUrl: '',
      detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=snos183/',
      isNew: true,
      rankChange: 'up',
    },
    {
      rank: 2,
      title: 'シリーズ累計販売数800万部 カラミざかり同窓会編 石川澪',
      actress: '石川澪',
      maker: 'ムーディーズ',
      coverUrl: '',
      detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=mimk267/',
      isNew: true,
      rankChange: 'up',
    },
    {
      rank: 3,
      title: '妊活のため一か月禁欲したのに妻にセックスを拒まれた翌日 JULIA',
      actress: 'JULIA',
      maker: 'ワンズファクトリー',
      coverUrl: '',
      detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=tkwaaa640/',
      isNew: true,
      rankChange: 'up',
    },
    {
      rank: 4,
      title: '乳房が宙に浮くほど エビ反りイク 媚薬オイル漬けエステ 木村愛心',
      actress: '木村愛心',
      maker: 'エスワン',
      coverUrl: '',
      detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=snos212/',
      isNew: true,
      rankChange: 'up',
    },
    {
      rank: 5,
      title: '男たちは誰もが沼るカラダ 長浜みつり',
      actress: '長浜みつり',
      maker: 'FAIR＆WAY',
      coverUrl: '',
      detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=fway094/',
      isNew: true,
      rankChange: 'up',
    },
  ];
}
