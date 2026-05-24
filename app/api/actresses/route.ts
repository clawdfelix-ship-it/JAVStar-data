import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// GET /api/actresses - List actresses with event counts + votes, sorted by weighted score
// Refactored: SQL-level LATERAL joins replace in-memory O(n) sort — scales to 500K rows
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'final_score';
    const offset = (page - 1) * limit;

    // Map sort param → column name
    const sortMap: Record<string, string> = {
      debut_year:  'debut_year',
      votes:        'vote_count',
      event_count:  'year_2026_events',
      age:          'age',
      name_ja:      'name_ja',
    };
    const orderCol = sortMap[sortBy] || 'final_score';
    const orderDir = sortBy === 'name_ja' ? 'ASC' : 'DESC';

    // ── Count query ──────────────────────────────────────────────────────────
    const countRows = search
      ? await sql`SELECT COUNT(*)::int as cnt FROM actresses WHERE name_ja ILIKE ${'%' + search + '%'} OR name_cn ILIKE ${'%' + search + '%'}`
      : await sql`SELECT COUNT(*)::int as cnt FROM actresses`;
    const total = (countRows as any)[0].cnt;

    // ── Main query: SQL-level scoring via LATERAL joins ─────────────────────
    // Score = year_2026_events * 0.7 + votes * 0.3 — all inside Postgres
    // No data loaded into Node.js memory for sorting
    const rows = await sql`
      SELECT
        a.id,
        a.name_ja,
        a.name_cn,
        a.avatar_url,
        a.age,
        a.zodiac,
        a.cup,
        a.height,
        a.bust,
        a.waist,
        a.hip,
        a.agency,
        a.hobby,
        a.debut_year,
        a.debut_date,
        a.debut_work,
        a.blog,
        a.official_site,
        a.tags,
        COALESCE(e.year_2026, 0)::int    AS year_2026_events,
        COALESCE(e.year_2025, 0)::int    AS year_2025_events,
        COALESCE(v.cnt, 0)::int           AS vote_count,
        (COALESCE(e.year_2026, 0) * 0.7 + COALESCE(v.cnt, 0) * 0.3)::numeric AS final_score
      FROM actresses a
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE datetime LIKE '2026%') AS year_2026,
          COUNT(*) FILTER (WHERE datetime LIKE '2025%') AS year_2025
        FROM   events
        WHERE  events.actress_id = a.id
      ) e ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM votes WHERE votes.actress_id = a.id
      ) v ON true
      ${search
        ? sql`WHERE a.name_ja ILIKE ${'%' + search + '%'} OR a.name_cn ILIKE ${'%' + search + '%'}`
        : sql``}
      ORDER BY
        CASE WHEN ${orderCol} IS NULL THEN 1 ELSE 0 END,
        ${orderCol} ${sql`${orderDir}`}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      queryTimeMs: duration,
    });

  } catch (error) {
    console.error('Error fetching actresses:', error);
    return NextResponse.json({ error: 'Failed to fetch actresses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name_ja, name_cn, avatar_url, bio, height, bust, waist, hip } = body;
    if (!id || !name_ja) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
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