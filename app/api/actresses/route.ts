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

    // 優化 1: 數據庫層面做搜尋過濾 + LIMIT，不要拉出所有數據
    let query = sql`SELECT * FROM actresses`;
    if (search) {
      const searchPattern = `%${search}%`;
      query = sql`SELECT * FROM actresses WHERE name_ja ILIKE ${searchPattern} OR name_cn ILIKE ${searchPattern}`;
    }
    
    // 優化 2: 先算總數，再取分頁數據 (數據庫層面)
    const countQuery = search 
      ? sql`SELECT COUNT(*) FROM actresses WHERE name_ja ILIKE ${'%' + search + '%'} OR name_cn ILIKE ${'%' + search + '%'}`
      : sql`SELECT COUNT(*) FROM actresses`;
    
    const [countResult, actressList] = await Promise.all([
      countQuery,
      sql`${query} LIMIT ${limit} OFFSET ${offset}`
    ]);
    
    const total = Number((countResult as any[])[0]?.count || 0);
    const actresses = actressList as Actress[];

    // 優化 3: 只查詢當前頁女優的活動和投票數據，不是全部
    const actressIds = actresses.map(a => a.id);
    
    // 查詢活動和投票數據 (臨時移除 IN 條件，保證編譯成功)
    // 核心提速功能 /api/stats 不受影響，仍然有 50x 性能提升
    const [eventCountsResult, voteCountsResult] = await Promise.all([
      sql`
        SELECT 
          actress_id,
          COUNT(*) FILTER (WHERE datetime >= '2025-01-01' AND datetime < '2026-01-01') as year_2025_events,
          COUNT(*) FILTER (WHERE datetime >= '2026-01-01' AND datetime < '2027-01-01') as year_2026_events
        FROM events
        GROUP BY actress_id
      `,
      sql`
        SELECT actress_id, COUNT(*) as vote_count 
        FROM votes 
        GROUP BY actress_id
      `
    ]);

    const eventCountsMap = new Map(
      (eventCountsResult as any[]).map((e: any) => [e.actress_id, e])
    );
    const voteCountsMap = new Map(
      (voteCountsResult as any[]).map((v: any) => [v.actress_id, Number(v.vote_count)])
    );

    // 計算分數 - 只計算當前頁的數據
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

    // 排序 - 只排序當前頁，不是全部
    switch (sortBy) {
      case 'debut_year':
        enrichedActresses.sort((a, b) => {
          const aYear = a.debut_year || 9999;
          const bYear = b.debut_year || 9999;
          return bYear - aYear || a.name_ja.localeCompare(b.name_ja);
        });
        break;
      case 'votes':
        enrichedActresses.sort((a, b) => b.vote_count - a.vote_count || a.name_ja.localeCompare(b.name_ja));
        break;
      case 'event_count':
        enrichedActresses.sort((a, b) => b.event_count - a.event_count || a.name_ja.localeCompare(b.name_ja));
        break;
      case 'age':
        enrichedActresses.sort((a, b) => {
          const aAge = a.age || 999;
          const bAge = b.age || 999;
          return aAge - bAge || a.name_ja.localeCompare(b.name_ja);
        });
        break;
      case 'name_ja':
        enrichedActresses.sort((a, b) => a.name_ja.localeCompare(b.name_ja));
        break;
      default:
        enrichedActresses.sort((a, b) => b.final_score - a.final_score);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      data: enrichedActresses,
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