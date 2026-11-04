import { getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

// GET /api/photobooks - 公開：只出 published 寫真集（JCHING 目錄）
// params: page, page_size, publisher, sort=release|new
export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(sp.get('page_size') || '24', 10) || 24));
    const publisher = sp.get('publisher') || '';
    const offset = (page - 1) * pageSize;

    const conds: string[] = ["status = 'published'"];
    const params: unknown[] = [];
    if (publisher) {
      params.push(publisher);
      conds.push(`publisher = $${params.length + 2}`);
    }

    // count
    const countParams = publisher ? [publisher] : [];
    const countRows = (await getSql().query(
      `SELECT COUNT(*)::int AS total FROM photobooks WHERE ${conds.join(' AND ')}`,
      countParams
    )) as Array<{ total: number }>;
    const total = countRows[0]?.total ?? 0;

    params.push(pageSize, offset);
    const rows = (await getSql().query(
      `SELECT isbn, book_title, actress_name, photographer, publisher,
              cover_url, source_url, release_date, price_jpy, order_note
         FROM photobooks
        WHERE ${conds.join(' AND ')}
        ORDER BY release_date DESC NULLS LAST, created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )) as Array<Record<string, unknown>>;

    return NextResponse.json({
      data: rows,
      pagination: { page, pageSize: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('photobooks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch photobooks', details: String(error) }, { status: 500 });
  }
}
