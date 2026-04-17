import { db } from '@/lib/db';
import { actresses, events, actress_events_count, votes } from '@/lib/db/schema';
import { desc, sql, and, gte, like, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/actresses - List actresses with event counts + votes, sorted by weighted score
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Get all actresses
    const actressList = db.select().from(actresses).all();

    // Get event counts for each actress
    const eventCounts = db.select().from(actress_events_count).all();
    const eventMap = new Map(eventCounts.map(e => [e.actress_id, e]));

    // Get all events to count manually
    const allEvents = db.select().from(events).all();

    // Get vote counts per actress
    const voteCounts = db
      .select({ actress_id: votes.actress_id, vote_count: sql<number>`count(*)` })
      .from(votes)
      .groupBy(votes.actress_id)
      .all();
    const voteMap = new Map(voteCounts.map(v => [v.actress_id, v.vote_count]));

    // Enrich data with weighted scoring
    // Formula: final_score = year_2026_events * 0.7 + votes * 0.3
    const enrichedActresses = actressList.map(actress => {
      const countData = eventMap.get(actress.id);
      const yearCount = countData?.year_2026_events || 0;
      const voteCount = voteMap.get(actress.id) || 0;
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
        a.name_cn.toLowerCase().includes(searchLower)
      );
    }

    // Sort by final_score descending (weighted: events 70% + votes 30%)
    filtered.sort((a, b) => b.final_score - a.final_score);

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
    return NextResponse.json(
      { error: 'Failed to fetch actresses' },
      { status: 500 }
    );
  }
}
