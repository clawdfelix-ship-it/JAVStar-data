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

    // 取得最後更新時間 - 讀取所有表的最新時間
    const [eventMaxUpdate, actressMaxUpdate, dvdRankingMaxUpdate, newReleasesMaxUpdate] = await Promise.all([
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM events`,
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM actresses`,
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM dvd_ranking`,
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM new_releases`
    ]);
    
    const getDate = (result: any) => {
      return Array.isArray(result) && result.length > 0 
        ? (result[0] as any)?.last_update 
        : null;
    };
    
    const dates = [
      new Date(getDate(eventMaxUpdate) || 0),
      new Date(getDate(actressMaxUpdate) || 0),
      new Date(getDate(dvdRankingMaxUpdate) || 0),
      new Date(getDate(newReleasesMaxUpdate) || 0),
      new Date()
    ];
    
    const lastUpdate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString();

    const actressCountNum = Number((actressCount as any[])[0]?.count || 0);
    const eventCountNum = Number((eventCount as any[])[0]?.count || 0);
    const voteCountNum = Number((voteCount as any[])[0]?.count || 0);
    // lastUpdate 已經係上面處理好嘅 ISO string

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
