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

    // Get events for this actress. Sort by the normalized DATE column
    // (date_iso), never raw `datetime` text — it contains full-width digits
    // and garbage values that mis-sort under UTF-8.
    const eventsResult = await sql`
      SELECT * FROM events
      WHERE actress_id = ${id}
      ORDER BY date_iso DESC NULLS LAST
    `;

    // ✅ 自動配對校驗：過濾錯誤配對的活動
    const allEvents = eventsResult as any[];
    const { validEvents, invalidEvents, stats: matchingStats } = validateAllEvents(
      allEvents,
      actress.name_ja,
      actress.name_cn
    );

    // 只使用驗證通過的活動計算統計。
    // 日期一律用 date_iso（YYYY-MM-DD，UTC 午夜）比字串即可，避免 new Date()
    // 對全形/日文日期回傳 1970 嘅問題。
    const todayStr = new Date().toISOString().slice(0, 10);
    const yearStr = todayStr.slice(0, 4);
    const monthStr = todayStr.slice(0, 7);
    const eventDate = (e: any): string =>
      e.date_iso ? new Date(e.date_iso).toISOString().slice(0, 10) : '';

    const totalEvents = validEvents.length;
    const thisYearEvents = validEvents.filter(e => eventDate(e) >= `${yearStr}-01-01`).length;
    const thisMonthEvents = validEvents.filter(e => eventDate(e).slice(0, 7) === monthStr).length;
    const upcomingEvents = validEvents.filter(e => eventDate(e) >= todayStr).length;

    // Normalize datetime for every consumer (calendar/list read `datetime`):
    // expose clean YYYY-MM-DD from date_iso; raw text has full-width digits
    // that make `new Date()` return 1970.
    const normalizedEvents = validEvents.map(e => ({
      ...e,
      datetime: eventDate(e) || e.datetime,
      date_iso: eventDate(e) || null,
    }));

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
      events: normalizedEvents,
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