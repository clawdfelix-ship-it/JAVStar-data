import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Moderate pending news items.
// GET  ?status=pending&limit=50  -> list queue (admin only)
// POST { id, action: 'approve' | 'reject' }
//      approve -> status='published'
//      reject  -> status='rejected'
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200);
  const allowed = ['pending', 'published', 'rejected', 'all'];
  const filter = allowed.includes(status) ? status : 'pending';

  const where = filter === 'all' ? '' : 'WHERE status = $1';
  const rows = (await getSql().query(
    `SELECT id, source_key, source_name, source_url, title_ja, summary_ja,
            category, is_adult, status, published_at, created_at
       FROM news_items ${where}
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT $${filter === 'all' ? '1' : '2'}`,
    filter === 'all' ? [limit] : [filter, limit]
  )) as Array<Record<string, unknown>>;

  return NextResponse.json({ success: true, status: filter, count: rows.length, items: rows });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  let body: { id?: number; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = Number(body.id);
  const action = body.action;
  if (!Number.isInteger(id) || !['approve', 'reject'].includes(action || '')) {
    return NextResponse.json(
      { error: 'Body must be { id:number, action:"approve"|"reject" }' },
      { status: 400 }
    );
  }

  const nextStatus = action === 'approve' ? 'published' : 'rejected';
  const rows = (await getSql().query(
    `UPDATE news_items
        SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, status, title_ja`,
    [nextStatus, id]
  )) as Array<{ id: number; status: string; title_ja: string }>;

  if (!rows.length) return NextResponse.json({ error: 'news item not found' }, { status: 404 });
  return NextResponse.json({ success: true, item: rows[0] });
}
