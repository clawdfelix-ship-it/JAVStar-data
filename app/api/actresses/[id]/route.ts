import sql from '@/lib/db';
import { Actress } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

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

    // Calculate stats
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const allEvents = eventsResult as any[];
    const totalEvents = allEvents.length;
    const thisYearEvents = allEvents.filter(e => new Date(e.datetime) >= thisYearStart).length;
    const thisMonthEvents = allEvents.filter(e => new Date(e.datetime) >= thisMonthStart).length;
    const upcomingEvents = allEvents.filter(e => new Date(e.datetime) >= now).length;

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
      events: allEvents,
    });

  } catch (error) {
    console.error('Error fetching actress:', error);
    return NextResponse.json({ error: 'Failed to fetch actress' }, { status: 500 });
  }
}