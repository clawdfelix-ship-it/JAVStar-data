import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 每日更新 Cron Job
// Vercel 會每日 00:00 UTC 呼叫此 API (香港時間 08:00)

export async function GET() {
  const startTime = new Date();
  console.log('[Cron] Daily update started at:', startTime.toISOString());

  try {
    // 1. 更新女優資料的 updated_at 時間 (標記系統今日有運行)
    const updateResult = await sql`
      UPDATE actresses 
      SET updated_at = NOW() 
      WHERE id = (SELECT id FROM actresses LIMIT 1)
      RETURNING id, updated_at
    `;

    // 2. 記錄更新日誌
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log('[Cron] Daily update completed:', {
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      duration_ms: duration,
      updated_actress: Array.isArray(updateResult) ? updateResult.length : 0
    });

    return NextResponse.json({
      success: true,
      message: 'Daily update completed',
      timestamp: endTime.toISOString(),
      duration_ms: duration
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
