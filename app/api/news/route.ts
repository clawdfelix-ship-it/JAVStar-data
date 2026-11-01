import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public news feed: only published items. Never expose pending/rejected queue.
// Supports both `limit` (simple cap) and paged mode: `page` (1-based) + `page_size`.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const source = searchParams.get('source');

  const conditions = ['status = $1'];
  const params: Array<string | number> = ['published'];
  if (category && /^[a-z_]+$/.test(category)) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (source && /^[a-z0-9_]+$/.test(source)) {
    params.push(source);
    conditions.push(`source_key = $${params.length}`);
  }
  const where = conditions.join(' AND ');

  // Total matching rows (for page controls), independent of paging.
  const totalRows = (await getSql().query(
    `SELECT COUNT(*)::int AS n FROM news_items WHERE ${where}`,
    params
  )) as Array<{ n: number }>;
  const total = totalRows[0]?.n ?? 0;

  const pageParam = Number(searchParams.get('page'));
  const paged = Number.isFinite(pageParam) && pageParam >= 1;
  let limit: number;
  let offset = 0;
  if (paged) {
    const pageSize = Math.min(Math.max(Number(searchParams.get('page_size')) || 10, 1), 50);
    const page = Math.max(1, Math.floor(pageParam));
    limit = pageSize;
    offset = (page - 1) * pageSize;
  } else {
    limit = Math.min(Number(searchParams.get('limit') || '60'), 200);
  }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const rows = (await getSql().query(
    `SELECT id, source_key, source_name, source_url,
            COALESCE(title_zh, title_ja) AS title,
            title_ja, title_zh, summary_ja, summary_zh,
            author, image_url, category, is_adult, published_at
       FROM news_items
      WHERE ${where}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  )) as Array<Record<string, unknown>>;

  return NextResponse.json({
    data: rows,
    count: rows.length,
    total,
    ...(paged
      ? {
          page: Math.max(1, Math.floor(pageParam)),
          page_size: limit,
          total_pages: Math.max(1, Math.ceil(total / limit)),
        }
      : {}),
  });
}
