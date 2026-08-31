import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Debug endpoint - 檢查活動數據狀態
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    // 檢查活動日期格式
    const sampleEvents = await sql`
      SELECT id, actress_id, title, datetime, 
             EXTRACT(YEAR FROM datetime::timestamp) as year,
             pg_typeof(datetime) as column_type
      FROM events 
      LIMIT 10
    `;

    // 按年份統計
    const byYear = await sql`
      SELECT 
        EXTRACT(YEAR FROM datetime::timestamp) as year,
        COUNT(*) as count
      FROM events
      GROUP BY year
      ORDER BY year DESC
    `;

    // 抽查幾個女優嘅活動數
    const actressCounts = await sql`
      SELECT 
        a.id,
        a.name_ja,
        COUNT(e.id) as total_events,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM e.datetime::timestamp) = 2026) as year_2026
      FROM actresses a
      LEFT JOIN events e ON a.id = e.actress_id
      GROUP BY a.id, a.name_ja
      ORDER BY total_events DESC
      LIMIT 10
    `;

    return NextResponse.json({
      sampleEvents,
      byYear,
      actressCounts,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
