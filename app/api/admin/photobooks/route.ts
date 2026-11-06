import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET  ?status=pending|published|rejected|all&limit=200
// POST { isbn, action:'approve'|'reject' }
//      { isbn, action:'update', price_jpy?, order_note? , book_title?, actress_name? }
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);
  const allowed = ['pending', 'published', 'rejected', 'all'];
  const filter = allowed.includes(status) ? status : 'pending';

  const where = filter === 'all' ? '' : 'WHERE status = $1';
  const rows = (await getSql().query(
    `SELECT isbn, book_title, actress_name, photographer, publisher, title_raw,
            cover_url, source_url, release_date, price_jpy, order_note, status, created_at
       FROM photobooks ${where}
      ORDER BY release_date DESC NULLS LAST, created_at DESC
      LIMIT $2`,
    filter === 'all' ? [limit] : [filter, limit]
  )) as Array<Record<string, unknown>>;

  const counts = (await getSql().query(
    `SELECT status, COUNT(*)::int AS n FROM photobooks GROUP BY status`
  )) as Array<{ status: string; n: number }>;

  return NextResponse.json({
    success: true,
    status: filter,
    count: rows.length,
    items: rows,
    counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
  });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  let body: {
    isbn?: string;
    isbns?: string[];
    action?: string;
    price_jpy?: number | null;
    order_note?: string | null;
    book_title?: string;
    actress_name?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const isBatch = Array.isArray(body.isbns);
  // 單本請求先硬性要求 isbn；批量請求（isbns 陣列）喺下面各自校驗，唔行呢個 guard
  const isbn = String(body.isbn || '').trim();
  if (!isBatch && !/^\d{13}$/.test(isbn)) {
    return NextResponse.json({ error: 'isbn (13 digits) required' }, { status: 400 });
  }
  const sql = getSql();

  if (body.action === 'update') {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (body.book_title !== undefined) {
      params.push(body.book_title);
      sets.push(`book_title = $${params.length}`);
    }
    if (body.actress_name !== undefined) {
      params.push(body.actress_name);
      sets.push(`actress_name = $${params.length}`);
    }
    if (body.price_jpy !== undefined) {
      params.push(body.price_jpy);
      sets.push(`price_jpy = $${params.length}`);
    }
    if (body.order_note !== undefined) {
      params.push(body.order_note);
      sets.push(`order_note = $${params.length}`);
    }
    if (!sets.length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    sets.push('updated_at = NOW()');
    params.push(isbn);
    const rows = (await sql.query(
      `UPDATE photobooks SET ${sets.join(', ')} WHERE isbn = $${params.length}
       RETURNING isbn, status, book_title, actress_name, price_jpy, order_note`,
      params
    )) as Array<Record<string, unknown>>;
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, item: rows[0] });
  }

  if (!['approve', 'reject'].includes(body.action || '')) {
    return NextResponse.json({ error: 'action must be approve/reject/update' }, { status: 400 });
  }
  const nextStatus = body.action === 'approve' ? 'published' : 'rejected';

  // 批量：{ action:'approve'|'reject', isbns:[...] }
  // 強制只改 status='pending' 嘅列，已 published/rejected 一律唔掂（冪等＋防誤傷）
  if (Array.isArray(body.isbns)) {
    const isbns = Array.from(
      new Set((body.isbns as unknown[]).map((x) => String(x).trim()).filter((x) => /^\d{13}$/.test(x)))
    );
    if (!isbns.length) return NextResponse.json({ error: 'no valid isbns (13 digits)' }, { status: 400 });
    if (isbns.length > 500) return NextResponse.json({ error: 'max 500 isbns per batch' }, { status: 400 });

    const rows = (await sql.query(
      `UPDATE photobooks SET status = $1, updated_at = NOW()
        WHERE status = 'pending' AND isbn = ANY($2)
        RETURNING isbn, status, book_title, actress_name, publisher`,
      [nextStatus, isbns]
    )) as Array<Record<string, unknown>>;

    const changedIsbns = new Set(rows.map((r) => String(r.isbn)));
    const skipped = isbns.filter((i) => !changedIsbns.has(i));
    return NextResponse.json({
      success: true,
      requested: isbns.length,
      updated: rows.length,
      skipped,
      action: body.action,
      items: rows,
    });
  }

  const rows = (await sql.query(
    `UPDATE photobooks SET status = $1, updated_at = NOW()
      WHERE isbn = $2
      RETURNING isbn, status, book_title, actress_name, publisher`,
    [nextStatus, isbn]
  )) as Array<Record<string, unknown>>;
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ success: true, item: rows[0] });
}
