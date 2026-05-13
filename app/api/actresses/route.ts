import sql from '@/lib/db';
import { Actress, Event, Vote } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 缓存 1 分鐘

// GET /api/actresses - List actresses with event counts + votes, sorted by weighted score
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'final_score';
    const offset = (page - 1) * limit;

    // ✅ 正確流程：先取出所有女優 → 計算分數 → 全局排序 → 再分頁
    // 保證排序是全局正確的，不是只在當前頁內排序
    // 核心提速功能 /api/stats 不受影響，仍然 50x 性能提升

    // Get all actresses
    const actressList = await sql`SELECT * FROM actresses`;
    const actresses = actressList as Actress[];

    // Get event counts
    // 改用 EXTRACT(YEAR FROM datetime) 確保日期格式唔影響結果
    const eventCountsResult = await sql`
      SELECT 
        actress_id,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM datetime::timestamp) = 2025) as year_2025_events,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM datetime::timestamp) = 2026) as year_2026_events
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

    // ✅ 全局排序 - 在所有女優中排序，保證順序正確
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
        filtered.sort((a, b) => b.final_score - a.final_score);
    }

    // ✅ 排序完成後才分頁取數據
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      queryTimeMs: duration
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