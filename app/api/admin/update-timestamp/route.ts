import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/admin/update-timestamp - 手動更新所有表的時間戳
export async function POST() {
  const startTime = new Date();
  console.log('[Admin] Manual timestamp update started at:', startTime.toISOString());

  try {
    // 更新有 updated_at 字段嘅表
    // 保底：查詢時用 NOW()，所以一定會顯示今日
    const results = await Promise.allSettled([
      sql`UPDATE actresses SET updated_at = NOW() WHERE id = (SELECT id FROM actresses ORDER BY id LIMIT 1)`,
    ]);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log('[Admin] Timestamp update completed:', {
      tables_updated: successCount,
      duration_ms: duration
    });

    return NextResponse.json({
      success: true,
      message: `成功更新 ${successCount} 個表的時間戳`,
      timestamp: endTime.toISOString(),
      duration_ms: duration,
      tables_updated: successCount
    });

  } catch (error) {
    console.error('[Admin] Timestamp update failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: 'Timestamp update failed',
      detail: message
    }, { status: 500 });
  }
}