import { sql, getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/events - List events.
// Default: only upcoming (datetime >= now). Pass ?past=1 to include past events.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefecture = searchParams.get('prefecture');
    const eventType = searchParams.get('type');
    const region = searchParams.get('region');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 2000);
    const offset = (page - 1) * limit;
    const requestedSortBy = searchParams.get('sort') || 'datetime';
    const requestedSortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    // Always sort events by datetime DESC (newest first) so latest July/August appear first
    // Default used to be ASC which meant only old events appeared in the first page
    const actualSortBy = requestedSortBy;
    const actualSortOrder = actualSortBy === 'datetime' ? 'DESC' : requestedSortOrder;

    // Include past events? Default: only upcoming
    const includePast = searchParams.get('past') === '1' || searchParams.get('past') === 'true';

    // Whitelist validation — only these columns are allowed in ORDER BY
    const allowedColumns: Record<string, string> = {
      datetime: 'e.datetime',
      created_at: 'e.created_at',
      title: 'e.title',
    };
    const sortCol = allowedColumns[actualSortBy] || 'e.datetime';
    const sortDir = actualSortOrder === 'ASC' ? 'ASC' : 'DESC';
    const orderByClause = `${sortCol} ${sortDir} NULLS LAST`;

    const now = new Date();
    const nowStr = now.toISOString();

    // Region filter
    const regionClauses: Record<string, string> = {
      japan: "prefecture IS NOT NULL AND prefecture != '' AND prefecture != '台北' AND prefecture NOT LIKE '%香港%'",
      taiwan: "prefecture = '台北'",
      hk: "prefecture LIKE '%香港%'",
    };

    // Build base WHERE conditions
    function buildWhereParts(pastFilter: boolean) {
      const parts: string[] = [];
      if (!pastFilter) parts.push(`e.datetime >= '${nowStr}'`);
      parts.push("e.actress_id IS NOT NULL AND e.actress_id != '0' AND e.actress_id != 'unknown'");
      if (prefecture) parts.push(`e.prefecture = '${prefecture}'`);
      if (eventType) parts.push(`e.event_type = '${eventType}'`);
      if (region && region !== 'all' && regionClauses[region]) {
        parts.push(regionClauses[region]);
      }
      return parts;
    }

    function buildWhere(pastFilter: boolean) {
      const parts = buildWhereParts(pastFilter);
      return parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '';
    }

    function buildCountWhere(pastFilter: boolean) {
      const parts: string[] = [];
      if (!pastFilter) parts.push(`datetime >= '${nowStr}'`);
      parts.push("actress_id IS NOT NULL AND actress_id != '0' AND actress_id != 'unknown'");
      if (prefecture) parts.push(`prefecture = '${prefecture}'`);
      if (eventType) parts.push(`event_type = '${eventType}'`);
      if (region && region !== 'all' && regionClauses[region]) {
        parts.push(regionClauses[region]);
      }
      return parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '';
    }

    // Get events — use sql.query() for fully-built query strings
    const whereClause = buildWhere(!includePast);
    const countWhereClause = buildCountWhere(!includePast);
    const fullQuery = `SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id ${whereClause} ORDER BY ${orderByClause} LIMIT ${limit}`;
    const countQuery = `SELECT COUNT(*) as total FROM events ${countWhereClause}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let eventsResult: any[] = await (getSql() as any).query(fullQuery) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countResult: any[] = await (getSql() as any).query(countQuery) as any[];
    const total = Number(countResult[0]?.total || 0);

    const enrichedEvents = eventsResult.map(event => ({
      ...event,
      actress_name: event.name_ja || event.name_cn || event.actress_id,
      actress_avatar: event.avatar_url,
    }));

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
