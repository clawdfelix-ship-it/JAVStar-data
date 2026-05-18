import sql from '@/lib/db';
import { NewRelease } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 缓存 5 分鐘

// GET /api/new-releases - 獲取每月新作列表
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // 基礎查詢
    let query = sql`SELECT * FROM new_releases`;
    let countQuery = sql`SELECT COUNT(*) as total FROM new_releases`;

    // 搜索過濾
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      query = sql`
        SELECT * FROM new_releases 
        WHERE LOWER(video_code) LIKE ${searchLower} 
           OR LOWER(title) LIKE ${searchLower}
           OR LOWER(actresses) LIKE ${searchLower}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countQuery = sql`
        SELECT COUNT(*) as total FROM new_releases 
        WHERE LOWER(video_code) LIKE ${searchLower} 
           OR LOWER(title) LIKE ${searchLower}
           OR LOWER(actresses) LIKE ${searchLower}
      `;
    } else {
      query = sql`
        SELECT * FROM new_releases 
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const [releases, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = Number((countResult as any)[0]?.total || 0);

    return NextResponse.json({
      data: releases as NewRelease[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      queryTimeMs: Date.now() - startTime,
    });

  } catch (error) {
    console.error('New releases API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch new releases', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/new-releases - 批量導入新作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { releases } = body;

    if (!releases || !Array.isArray(releases)) {
      return NextResponse.json(
        { error: 'Invalid request: releases array required' },
        { status: 400 }
      );
    }

    let inserted = 0;
    let skipped = 0;

    for (const release of releases) {
      try {
        // 使用 INSERT ... ON CONFLICT 避免重複
        await sql`
          INSERT INTO new_releases (video_code, title, cover_url, detail_url, actresses, release_date, maker)
          VALUES (${release.video_code}, ${release.title}, ${release.cover_url || null}, ${release.detail_url || null}, ${release.actresses || null}, ${release.release_date || null}, ${release.maker || null})
          ON CONFLICT (video_code) DO NOTHING
        `;
        inserted++;
      } catch (e) {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: releases.length,
    });

  } catch (error) {
    console.error('Import new releases error:', error);
    return NextResponse.json(
      { error: 'Failed to import new releases', details: String(error) },
      { status: 500 }
    );
  }
}
