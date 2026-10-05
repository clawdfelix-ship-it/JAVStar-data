import { getSql } from '@/lib/db';
import { buildEventsQueries, parsePositiveInt } from '@/lib/events-query.mjs';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/events - List events.
// Default: only upcoming (datetime >= now). Pass ?past=1 to include past events.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefecture = searchParams.get('prefecture');
    const eventType = searchParams.get('type');
    const organizer = searchParams.get('organizer');
    const region = searchParams.get('region');
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = parsePositiveInt(searchParams.get('limit'), 200, 2000);
    const offset = (page - 1) * limit;
    const requestedSortBy = searchParams.get('sort') || 'datetime';
    const requestedSortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    // Always sort events by datetime DESC (newest first) so latest July/August appear first
    // Default used to be ASC which meant only old events appeared in the first page
    const actualSortBy = requestedSortBy;
    const actualSortOrder = actualSortBy === 'datetime' ? 'DESC' : requestedSortOrder;

    // Include past events? Default: only upcoming
    const includePast = searchParams.get('past') === '1' || searchParams.get('past') === 'true';

    const sortDir = actualSortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Get events — use sql.query() for fully-built query strings
    // includePast=true  -> show everything (no upcoming-only filter) => pastFilter=true
    // includePast=false -> upcoming only (date_iso >= CURRENT_DATE) => pastFilter=false
    const { fullQuery, countQuery } = buildEventsQueries({
      prefecture,
      eventType,
      organizer,
      region,
      includePast,
      sortBy: actualSortBy,
      sortOrder: sortDir,
      limit,
      offset,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let eventsResult: any[] = await (getSql() as any).query(fullQuery) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countResult: any[] = await (getSql() as any).query(countQuery) as any[];
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
