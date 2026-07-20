import { sql, getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/events - List events.
// Default: only upcoming (datetime >= now). Pass ?past=1 to include past events.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefecture = searchParams.get('prefecture');
    const eventType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sort') || 'datetime';
    const sortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    // Include past events? Default: only upcoming
    const includePast = searchParams.get('past') === '1' || searchParams.get('past') === 'true';

    // Whitelist validation — only these columns are allowed in ORDER BY
    const allowedColumns: Record<string, string> = {
      datetime: 'e.datetime',
      created_at: 'e.created_at',
      title: 'e.title',
    };
    const sortCol = allowedColumns[sortBy] || 'e.datetime';
    const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const orderByClause = `${sortCol} ${sortDir} NULLS LAST`;

    const now = new Date();
    const nowStr = now.toISOString();

    // Get events with optional filters
    let eventsResult: any[];
    if (prefecture && eventType) {
      if (includePast) {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.prefecture = ${prefecture} AND e.event_type = ${eventType} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      } else {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.datetime >= ${nowStr} AND e.prefecture = ${prefecture} AND e.event_type = ${eventType} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      }
    } else if (prefecture) {
      if (includePast) {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.prefecture = ${prefecture} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      } else {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.datetime >= ${nowStr} AND e.prefecture = ${prefecture} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      }
    } else if (eventType) {
      if (includePast) {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.event_type = ${eventType} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      } else {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.datetime >= ${nowStr} AND e.event_type = ${eventType} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      }
    } else {
      if (includePast) {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      } else {
        eventsResult = await getSql()`SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id WHERE e.datetime >= ${nowStr} ORDER BY ${orderByClause} LIMIT ${limit}` as any[];
      }
    }

    // Get total count
    let countResult: any[];
    if (prefecture && eventType) {
      if (includePast) {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE prefecture = ${prefecture} AND event_type = ${eventType}` as any[];
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr} AND prefecture = ${prefecture} AND event_type = ${eventType}` as any[];
      }
    } else if (prefecture) {
      if (includePast) {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE prefecture = ${prefecture}` as any[];
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr} AND prefecture = ${prefecture}` as any[];
      }
    } else if (eventType) {
      if (includePast) {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE event_type = ${eventType}` as any[];
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr} AND event_type = ${eventType}` as any[];
      }
    } else {
      if (includePast) {
        countResult = await sql`SELECT COUNT(*) as total FROM events` as any[];
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM events WHERE datetime >= ${nowStr}` as any[];
      }
    }
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
