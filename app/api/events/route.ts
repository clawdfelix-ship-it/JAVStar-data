import { getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { buildEventWhereClause } from '@/lib/route-security.mjs';

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
    const requestedSortBy = searchParams.get('sort') || 'datetime';
    const requestedSortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    // Always sort events by datetime DESC (newest first) so latest July/August appear first
    // Default used to be ASC which meant only old events appeared in the first page
    const actualSortBy = requestedSortBy;
    const actualSortOrder = actualSortBy === 'datetime' ? 'DESC' : requestedSortOrder;

    // Include past events? Default: only upcoming
    const includePast = searchParams.get('past') === '1' || searchParams.get('past') === 'true';

    // Whitelist validation — only these columns are allowed in ORDER BY.
    // NOTE: sort by the normalized DATE column `date_iso`, never the raw `datetime`
    // text — raw values contain fullwidth digits (２０２６) and junk (2026-26-08)
    // that sort above real ASCII dates and pollute the calendar/upcoming lists.
    const allowedColumns: Record<string, string> = {
      datetime: 'e.date_iso',
      created_at: 'e.created_at',
      title: 'e.title',
    };
    const sortCol = allowedColumns[actualSortBy] || 'e.date_iso';
    const sortDir = actualSortOrder === 'ASC' ? 'ASC' : 'DESC';
    // Tie-break deterministically on date_iso, then insertion time.
    const orderByClause = sortCol === 'e.date_iso'
      ? `e.date_iso ${sortDir} NULLS LAST, e.created_at DESC`
      : `${sortCol} ${sortDir} NULLS LAST`;

    // Get events — use sql.query() for fully-built query strings
    // includePast=true  -> show everything (no upcoming-only filter) => pastFilter=true
    // includePast=false -> upcoming only (date_iso >= CURRENT_DATE) => pastFilter=false
    const { whereClause, params } = buildEventWhereClause({
      prefecture,
      eventType,
      organizer,
      region,
      includePast,
      tableAlias: 'e',
    });
    const { whereClause: countWhereClause, params: countParams } = buildEventWhereClause({
      prefecture,
      eventType,
      organizer,
      region,
      includePast,
    });
    const limitParamIndex = params.length + 1;
    const fullQuery = `SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id ${whereClause} ORDER BY ${orderByClause} LIMIT $${limitParamIndex}`;
    const countQuery = `SELECT COUNT(*) as total FROM events ${countWhereClause}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let eventsResult: any[] = await (getSql() as any).query(fullQuery, [...params, limit]) as any[];
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
