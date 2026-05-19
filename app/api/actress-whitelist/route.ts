import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Cache 配置
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 小時
let cachedWhitelist: any = null;
let lastFetchTime = 0;

// GET /api/actress-whitelist - 拎 DMM Top 200 女優白名單
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const random = searchParams.get('random') === 'true';
    const count = parseInt(searchParams.get('count') || '1');

    // 檢查 cache
    const now = Date.now();
    if (!cachedWhitelist || now - lastFetchTime > CACHE_DURATION) {
      const result = await sql`
        SELECT * FROM actress_whitelist
        WHERE is_active = true
        ORDER BY rank ASC
        LIMIT 200
      `;
      cachedWhitelist = result;
      lastFetchTime = now;
    }

    let data = cachedWhitelist;

    // 如果要求隨機抽樣
    if (random) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      data = shuffled.slice(0, Math.min(count, data.length));
    } else {
      data = data.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data,
      total: cachedWhitelist.length,
      cached: true,
    });

  } catch (error) {
    console.error('獲取女優白名單失敗:', error);
    return NextResponse.json({
      success: false,
      error: '獲取女優白名單失敗',
      data: []
    }, { status: 500 });
  }
}

// POST /api/actress-whitelist - 批量更新白名單
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { whitelist, source = 'DMM Actress Ranking', clearFirst = true } = body;

    if (!whitelist || !Array.isArray(whitelist)) {
      return NextResponse.json({
        success: false,
        error: '缺少白名單數據',
      }, { status: 400 });
    }

    // 清空舊數據
    if (clearFirst) {
      await sql`TRUNCATE TABLE actress_whitelist`;
    }

    // 批量插入
    let inserted = 0;
    for (const item of whitelist) {
      try {
        await sql`
          INSERT INTO actress_whitelist (rank, actress_name, dmm_id, avatar_url, profile_url, source)
          VALUES (${item.rank || inserted + 1}, ${item.actress_name || item.name}, ${item.dmm_id || item.id}, ${item.avatar_url}, ${item.profile_url}, ${source})
          ON CONFLICT (rank) DO UPDATE SET
            actress_name = EXCLUDED.actress_name,
            dmm_id = EXCLUDED.dmm_id,
            avatar_url = EXCLUDED.avatar_url,
            profile_url = EXCLUDED.profile_url,
            updated_at = CURRENT_TIMESTAMP
        `;
        inserted++;
      } catch (e) {
        console.warn(`插入第 ${item.rank} 失敗:`, e);
      }
    }

    // 清除 cache
    cachedWhitelist = null;

    return NextResponse.json({
      success: true,
      message: `✅ 白名單更新成功！共 ${inserted} 位女優`,
      inserted,
    });

  } catch (error) {
    console.error('更新女優白名單失敗:', error);
    return NextResponse.json({
      success: false,
      error: '更新失敗',
      details: String(error),
    }, { status: 500 });
  }
}
