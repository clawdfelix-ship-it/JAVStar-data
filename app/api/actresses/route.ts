import { getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// GET /api/actresses - List actresses with event counts + votes, sorted by weighted score
// Uses pre-aggregated actress_events_count table + indexed lookups → 5x faster
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'final_score';
    const hasUpcoming = searchParams.get('has_upcoming') === '1';
    const offset = (page - 1) * limit;

    // Sort whitelist
    const sortMap: Record<string, { col: string; dir: string }> = {
      debut_year:  { col: 'debut_year',       dir: 'DESC' },
      votes:       { col: 'vote_count',        dir: 'DESC' },
      event_count: { col: 'year_2026_events',  dir: 'DESC' },
      age:         { col: 'age',              dir: 'DESC' },
      name_ja:     { col: 'name_ja',           dir: 'ASC'  },
      upcoming:    { col: 'next_event_date',   dir: 'ASC'  },
    };
    const sort = sortMap[sortBy] ?? null;

    const sql = getSql();

    // WHERE conditions
    const whereParts: string[] = [];
    if (search) {
      const safe = search.replace(/'/g, "''");
      whereParts.push(`(a.name_ja ILIKE '%${safe}%' OR a.name_cn ILIKE '%${safe}%')`);
    }
    if (hasUpcoming) {
      whereParts.push(`ne.datetime IS NOT NULL`);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // ORDER BY
    // For 'upcoming' sort, put NULLs last so actresses with events surface first
    const orderByClause = sortBy === 'upcoming'
      ? `ne.datetime ASC NULLS LAST`
      : sort
        ? `"${sort.col}" ${sort.dir} NULLS LAST`
        : `(COALESCE(ec.year_2026_events, 0) * 0.7 + COALESCE(v.cnt, 0) * 0.3) DESC`;

    // Main query — uses pre-aggregated actress_events_count + indexed votes lookup
    const nowStr = new Date().toISOString().slice(0, 10);
    const query = `
      SELECT
        a.id, a.name_ja, a.name_cn, a.avatar_url,
        a.age, a.zodiac, a.cup, a.height,
        a.bust, a.waist, a.hip, a.agency, a.hobby,
        a.debut_year, a.debut_date, a.debut_work,
        a.blog, a.official_site, a.tags,
        COALESCE(ec.year_2026_events, 0)::int AS year_2026_events,
        COALESCE(ec.year_2025_events, 0)::int AS year_2025_events,
        COALESCE(v.cnt, 0)::int               AS vote_count,
        ne.datetime                           AS next_event_date,
        ne.title                              AS next_event_title,
        (COALESCE(ec.year_2026_events, 0) * 0.7 + COALESCE(v.cnt, 0) * 0.3) AS final_score
      FROM actresses a
      LEFT JOIN actress_events_count ec ON ec.actress_id = a.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM votes WHERE votes.actress_id = a.id
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT datetime, title FROM events
        WHERE events.actress_id = a.id AND events.datetime >= '${nowStr}'
        ORDER BY events.datetime ASC LIMIT 1
      ) ne ON true
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Count query — same WHERE
    const countQuery = `
      SELECT COUNT(*)::int as cnt FROM actresses a
      LEFT JOIN LATERAL (
        SELECT datetime FROM events
        WHERE events.actress_id = a.id AND events.datetime >= '${nowStr}'
        ORDER BY events.datetime ASC LIMIT 1
      ) ne ON true
      ${whereClause}
    `;
    const countRows = await sql.query(countQuery);
    const total = (countRows as any)[0].cnt;

    const rows = await sql.query(query);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      queryTimeMs: duration,
    });

  } catch (error) {
    console.error('Error fetching actresses:', error);
    return NextResponse.json({ error: 'Failed to fetch actresses', detail: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name_ja, name_cn, avatar_url, bio, height, bust, waist, hip } = body;
    if (!id || !name_ja) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const sql = getSql();
    await sql`
      INSERT INTO actresses (id, name_ja, name_cn, avatar_url, bio, height, bust, waist, hip)
      VALUES (${id}, ${name_ja}, ${name_cn}, ${avatar_url}, ${bio}, ${height}, ${bust}, ${waist}, ${hip})
    `;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating actress:', error);
    return NextResponse.json({ error: 'Failed to create actress' }, { status: 500 });
  }
}