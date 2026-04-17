import { db } from '@/lib/db';
import { actresses, events } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/actresses/[id] - Get actress details
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;
    
    // Get actress
    const actress = db.select().from(actresses).where(eq(actresses.id, id)).get();
    
    if (!actress) {
      return NextResponse.json(
        { error: 'Actress not found' },
        { status: 404 }
      );
    }

    // Get events for this actress
    const actressEvents = db
      .select()
      .from(events)
      .where(eq(events.actress_id, id))
      .orderBy(desc(events.datetime))
      .all();

    // Calculate stats
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const totalEvents = actressEvents.length;
    const thisYearEvents = actressEvents.filter(e => new Date(e.datetime) >= thisYearStart).length;
    const thisMonthEvents = actressEvents.filter(e => new Date(e.datetime) >= thisMonthStart).length;
    const upcomingEvents = actressEvents.filter(e => new Date(e.datetime) >= now).length;

    return NextResponse.json({
      actress: {
        ...actress,
        stats: {
          total_events: totalEvents,
          year_2026_events: thisYearEvents,
          month_04_2026_events: thisMonthEvents,
          upcoming_events: upcomingEvents,
        }
      },
      events: actressEvents,
    });

  } catch (error) {
    console.error('Error fetching actress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actress' },
      { status: 500 }
    );
  }
}