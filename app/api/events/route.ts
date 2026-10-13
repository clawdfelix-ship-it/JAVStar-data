import { getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { buildEventsQueries } from '@/lib/events-query';

// GET /api/events - List events.
// Default: only upcoming (datetime >= now). Pass ?past=1 to include past events.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefecture = searchParams.get('prefecture');
    const eventType = searchParams.get('type');
    const organizer = searchParams.get('organizer');
    const region = searchParams.get('region');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 2000);
    const offset = (page - 1) * limit;
    const requestedSortBy = searchParams.get('sort') || 'datetime';
    const requestedSortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    // Include past events? Default: only upcoming
    const includePast = searchParams.get('past') === '1' || searchParams.get('past') === 'true';
    const { fullQuery, countQuery, queryParams, countParams } = buildEventsQueries({
      prefecture,
      eventType,
      organizer,
      region,
      includePast,
      limit,
      sortBy: requestedSortBy,
      sortOrder: requestedSortOrder,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsResult: any[] = await (getSql() as any).query(fullQuery, queryParams) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countResult: any[] = await (getSql() as any).query(countQuery, countParams) as any[];
    const total = Number(countResult[0]?.total || 0);

    // Normalize the date every consumer reads. Raw `datetime` is messy text
    // (fullwidth ２０２６, junk 2026-26-08, Japanese) that `new Date()` / parseISO
    // choke on. `date_iso` is a real DATE; when present expose it (YYYY-MM-DD) as
    // `datetime` too so the calendar, list and home views all place events on the
    // right day. Rows without a parseable date were already filtered out above.
    const enrichedEvents = eventsResult.map(event => {
      const isoDate = event.date_iso
        ? new Date(event.date_iso).toISOString().slice(0, 10)
        : null;
      return {
        ...event,
        datetime: isoDate || event.datetime,
        date_iso: isoDate,
        actress_name: event.name_ja || event.name_cn || event.actress_id,
        actress_avatar: event.avatar_url,
      };
    });

    return NextResponse.json({
      data: enrichedEvents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      meta: { count: enrichedEvents.length, total, prefecture, eventType: eventType }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch events', detail: message }, { status: 500 });
  }
}
