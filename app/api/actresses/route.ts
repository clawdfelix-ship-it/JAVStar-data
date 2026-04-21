import sql from '@/lib/db';
import { Actress, Event, Vote } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/actresses - List actresses with event counts + votes, sorted by weighted score
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'final_score'; // sort by: final_score, debut_year, votes, event_count, age, name_ja
    const offset = (page - 1) * limit;

    // Get all actresses
    const actressList = await sql`SELECT * FROM actresses`;
    const actresses = actressList as Actress[];

    // Get event counts
    const eventCountsResult = await sql`
      SELECT 
        actress_id,
        COUNT(*) FILTER (WHERE datetime >= '2025-01-01' AND datetime < '2026-01-01') as year_2025_events,
        COUNT(*) FILTER (WHERE datetime >= '2026-01-01' AND datetime < '2027-01-01') as year_2026_events
      FROM events
      GROUP BY actress_id
    `;
    const eventCountsMap = new Map(
      (eventCountsResult as any[]).map((e: any) => [e.actress_id, e])
    );

    // Get vote counts
    const voteCountsResult = await sql`
      SELECT actress_id, COUNT(*) as vote_count 
      FROM votes 
      GROUP BY actress_id
    `;
    const voteCountsMap = new Map(
      (voteCountsResult as any[]).map((v: any) => [v.actress_id, Number(v.vote_count)])
    );

    // Enrich with weighted scoring
    // Formula: final_score = year_2026_events * 0.7 + votes * 0.3
    const enrichedActresses = actresses.map(actress => {
      const countData = eventCountsMap.get(actress.id);
      const yearCount = countData?.year_2026_events || 0;
      const voteCount = voteCountsMap.get(actress.id) || 0;
      const finalScore = Math.round(yearCount * 0.7 + voteCount * 0.3);

      return {
        ...actress,
        event_count: yearCount,
        year_2025_events: countData?.year_2025_events || 0,
        year_2026_events: yearCount,
        vote_count: voteCount,
        final_score: finalScore,
      };
    });

    // Filter by search
    let filtered = enrichedActresses;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = enrichedActresses.filter(a =>
        a.name_ja.toLowerCase().includes(searchLower) ||
        (a.name_cn && a.name_cn.toLowerCase().includes(searchLower))
      );
    }

    // Sort based on sortBy parameter
    switch (sortBy) {
      case 'debut_year':
        filtered.sort((a, b) => {
          const aYear = a.debut_year || 9999;
          const bYear = b.debut_year || 9999;
          return bYear - aYear || a.name_ja.localeCompare(b.name_ja);
        });
        break;
      case 'votes':
        filtered.sort((a, b) => b.vote_count - a.vote_count || a.name_ja.localeCompare(b.name_ja));
        break;
      case 'event_count':
        filtered.sort((a, b) => b.event_count - a.event_count || a.name_ja.localeCompare(b.name_ja));
        break;
      case 'age':
        filtered.sort((a, b) => {
          const aAge = a.age || 999;
          const bAge = b.age || 999;
          return aAge - bAge || a.name_ja.localeCompare(b.name_ja);
        });
        break;
      case 'name_ja':
        filtered.sort((a, b) => a.name_ja.localeCompare(b.name_ja));
        break;
      default:
        // final_score - sort by weighted score descending
        filtered.sort((a, b) => b.final_score - a.final_score);
    }

    // Paginate
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Error fetching actresses:', error);
    return NextResponse.json({ error: 'Failed to fetch actresses' }, { status: 500 });
  }
}

// POST /api/actresses - Create actress
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