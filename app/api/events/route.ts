import { db } from '@/lib/db';
import { events, actresses } from '@/lib/db/schema';
import { desc, gte, and, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/events - List upcoming events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const prefecture = searchParams.get('prefecture');
    const eventType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Get events
    let eventsQuery = db
      .select({
        id: events.id,
        actress_id: events.actress_id,
        title: events.title,
        venue: events.venue,
        prefecture: events.prefecture,
        datetime: events.datetime,
        event_type: events.event_type,
        url: events.url,
      })
      .from(events)
      .where(
        and(
          gte(events.datetime, now.toISOString()),
        )
      )
      .orderBy(events.datetime);

    let allEvents = eventsQuery.all();

    // Filter by prefecture
    if (prefecture) {
      allEvents = allEvents.filter(e => e.prefecture === prefecture);
    }

    // Filter by event type
    if (eventType) {
      allEvents = allEvents.filter(e => e.event_type === eventType);
    }

    // Get actress names for enrichment
    const actressList = db.select().from(actresses).all();
    const actressMap = new Map(actressList.map(a => [a.id, a]));

    // Enrich with actress info
    const enrichedEvents = allEvents.map(event => {
      const actress = actressMap.get(event.actress_id);
      return {
        ...event,
        actress_name: actress?.name_ja || actress?.name_cn || event.actress_id,
        actress_avatar: actress?.avatar_url,
      };
    });

    // Paginate
    const offset = (page - 1) * limit;
    const paginated = enrichedEvents.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total: enrichedEvents.length,
        totalPages: Math.ceil(enrichedEvents.length / limit),
      },
      meta: {
        count: paginated.length,
        total: enrichedEvents.length,
        days,
        prefecture,
        event_type: eventType,
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}