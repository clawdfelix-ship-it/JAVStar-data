import sql from '@/lib/db';
import { Event, Actress } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/events - List upcoming events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefecture = searchParams.get('prefecture');
    const eventType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const now = new Date();
    const nowStr = now.toISOString();

    // Get events with optional filters
    let eventsResult;
    if (prefecture && eventType) {
      eventsResult = await sql`
        SELECT e.*, a.name_ja, a.name_cn, a.avatar_url 
        FROM events e 
        LEFT JOIN actresses a ON e.actress_id = a.id 
        WHERE e.datetime >= ${nowStr}
          AND e.prefecture = ${prefecture}
          AND e.event_type = ${eventType}
        ORDER BY e.datetime
        LIMIT ${limit}
      `;
    } else if (prefecture) {
      eventsResult = await sql`
        SELECT e.*, a.name_ja, a.name_cn, a.avatar_url 
        FROM events e 
        LEFT JOIN actresses a ON e.actress_id = a.id 
        WHERE e.datetime >= ${nowStr}
          AND e.prefecture = ${prefecture}
        ORDER BY e.datetime
        LIMIT ${limit}
      `;
    } else if (eventType) {
      eventsResult = await sql`
        SELECT e.*, a.name_ja, a.name_cn, a.avatar_url 
        FROM events e 
        LEFT JOIN actresses a ON e.actress_id = a.id 
        WHERE e.datetime >= ${nowStr}
          AND e.event_type = ${eventType}
        ORDER BY e.datetime
        LIMIT ${limit}
      `;
    } else {
      eventsResult = await sql`
        SELECT e.*, a.name_ja, a.name_cn, a.avatar_url 
        FROM events e 
        LEFT JOIN actresses a ON e.actress_id = a.id 
        WHERE e.datetime >= ${nowStr}
        ORDER BY e.datetime
        LIMIT ${limit}
      `;
    }

    // Get total count
    let countResult;
    if (prefecture && eventType) {
      countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr} AND prefecture = ${prefecture} AND event_type = ${eventType}`;
    } else if (prefecture) {
      countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr} AND prefecture = ${prefecture}`;
    } else if (eventType) {
      countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr} AND event_type = ${eventType}`;
    } else {
      countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr}`;
    }
    const total = Number((countResult as any[])[0]?.total || 0);

    const enrichedEvents = (eventsResult as any[]).map(event => ({
      ...event,
      actress_name: event.name_ja || event.name_cn || event.actress_id,
      actress_avatar: event.avatar_url,
    }));

    return NextResponse.json({
      data: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: { count: enrichedEvents.length, total, prefecture, event_type: eventType }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}