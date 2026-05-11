import sql from '@/lib/db';
import { Actress } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { validateAllEvents } from '@/lib/matching-validator';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/actresses/[id] - Get actress details
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Get actress
    const results = await sql`SELECT * FROM actresses WHERE id = ${id}`;
    const actress = (results as Actress[])[0];

    if (!actress) {
      return NextResponse.json({ error: 'Actress not found' }, { status: 404 });
    }

    // Get events for this actress
    const eventsResult = await sql`
      SELECT * FROM events 
      WHERE actress_id = ${id} 
      ORDER BY datetime DESC
    `;

    // ✅ 自動配對校驗：過濾錯誤配對的活動
    const allEvents = eventsResult as any[];
    const { validEvents, invalidEvents, stats: matchingStats } = validateAllEvents(
      allEvents,
      actress.name_ja,
      actress.name_cn
    );

    // 只使用驗證通過的活動計算統計
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const totalEvents = validEvents.length;
    const thisYearEvents = validEvents.filter(e => new Date(e.datetime) >= thisYearStart).length;
    const thisMonthEvents = validEvents.filter(e => new Date(e.datetime) >= thisMonthStart).length;
    const upcomingEvents = validEvents.filter(e => new Date(e.datetime) >= now).length;

    // Get vote count
    const voteResult = await sql`SELECT COUNT(*) as count FROM votes WHERE actress_id = ${id}`;
    const voteCount = Number((voteResult as any[])[0]?.count || 0);

    return NextResponse.json({
      actress: {
        ...actress,
        stats: {
          total_events: totalEvents,
          year_2026_events: thisYearEvents,
          month_04_2026_events: thisMonthEvents,
          upcoming_events: upcomingEvents,
        },
        vote_count: voteCount,
      },
      events: validEvents,
      // 配對校驗統計 - 便於調試和數據清洗
      _matchingValidation: {
        totalChecked: matchingStats.total,
        filteredCount: matchingStats.invalid,
        filterRate: matchingStats.filterRate,
        filteredEvents: invalidEvents.slice(0, 10) // 只返回前 10 個錯配活動供參考
      }
    });

  } catch (error) {
    console.error('Error fetching actress:', error);
    return NextResponse.json({ error: 'Failed to fetch actress' }, { status: 500 });
  }
}