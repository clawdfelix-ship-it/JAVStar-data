import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { ensureNewsTables } from '@/lib/news/ingest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public news feed: only published items. Never expose pending/rejected queue.
export async function GET(request: NextRequest) {
  await ensureNewsTables();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || '60'), 200);
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
  params.push(limit);

  const rows = (await getSql().query(
    `SELECT id, source_key, source_name, source_url,
            COALESCE(title_zh, title_ja) AS title,
            title_ja, title_zh, summary_ja, summary_zh,
            author, image_url, category, is_adult, published_at
       FROM news_items
      WHERE ${conditions.join(' AND ')}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $${params.length}`,
    params
  )) as Array<Record<string, unknown>>;

  return NextResponse.json({ data: rows, count: rows.length });
}
