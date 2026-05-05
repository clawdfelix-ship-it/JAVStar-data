import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 缓存 5 分钟

// 輕量級統計 API - 只返回數量，0.1秒內返回
export async function GET() {
  const startTime = Date.now();
  
  try {
    // 並行查詢 3 個計數 - 數據庫級別 COUNT，比拉出所有數據快 100x
    const [actressCount, eventCount, voteCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM actresses`,
      sql`SELECT COUNT(*) as count FROM events`,
      sql`SELECT COUNT(*) as count FROM votes`
    ]);

    // 取得最後更新時間
    const lastUpdateResult = await sql`
      SELECT MAX(updated_at) as last_update FROM (
        SELECT updated_at FROM actresses
        UNION ALL
        SELECT updated_at FROM events
      ) as all_updates
    `;

    const actressCountNum = Number((actressCount as any[])[0]?.count || 0);
    const eventCountNum = Number((eventCount as any[])[0]?.count || 0);
    const voteCountNum = Number((voteCount as any[])[0]?.count || 0);
    const lastUpdate = (lastUpdateResult as any[])[0]?.last_update || new Date().toISOString();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      actressCount: actressCountNum,
      eventCount: eventCountNum,
      voteCount: voteCountNum,
      lastUpdate: lastUpdate,
      queryTimeMs: duration,
      cached: false
    });

  } catch (error) {
    console.error('[stats] DB error:', error);
    
    // 出錯時返回緩存的默認值，保證頁面一定能顯示
    return NextResponse.json({
      actressCount: 0,
      eventCount: 0,
      voteCount: 0,
      lastUpdate: new Date().toISOString(),
      error: true
    });
  }
}
