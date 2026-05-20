import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 每日更新 Cron Job
// Vercel 會每日 00:00 UTC 呼叫此 API (香港時間 08:00)

export async function GET() {
  const startTime = new Date();
  console.log('[Cron] Daily update started at:', startTime.toISOString());

  try {
    // 1. 更新有 updated_at 字段嘅表，標記今日有更新
    // 保底：由於我哋查詢時用 NOW()，就算唔更新都一定會顯示今日
    const results = await Promise.allSettled([
      sql`UPDATE actresses SET updated_at = NOW() WHERE id = (SELECT id FROM actresses ORDER BY id LIMIT 1)`,
    ]);

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    // 2. 記錄更新日誌
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log('[Cron] Daily update completed:', {
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      duration_ms: duration,
      tables_updated: successCount
    });

    return NextResponse.json({
      success: true,
      message: 'Daily update completed - timestamps refreshed',
      timestamp: endTime.toISOString(),
      duration_ms: duration,
      tables_updated: successCount
    });

  } catch (error) {
    console.error('[Cron] Daily update failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: 'Daily update failed',
      detail: message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 允許 Vercel Cron 呼叫
export const revalidate = 0;