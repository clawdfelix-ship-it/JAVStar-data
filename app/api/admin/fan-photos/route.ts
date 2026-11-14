import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/admin/fan-photos?status=pending|published|rejected|all
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const sp = new URL(request.url).searchParams;
    const status = sp.get('status') || 'pending';
    const allowed = ['pending', 'published', 'rejected', 'all'];
    const filter = allowed.includes(status) ? status : 'pending';

    const sql = getSql();
    const where = filter === 'all' ? '' : 'WHERE status = $1';
    const rows = (await sql.query(
      `SELECT * FROM actress_fan_photos ${where}
        ORDER BY created_at DESC LIMIT 200`,
      filter === 'all' ? [] : [filter]
    )) as Array<Record<string, unknown>>;

    const counts = (await sql.query(
      `SELECT status, count(*)::int AS n FROM actress_fan_photos GROUP BY status`
    )) as Array<{ status: string; n: number }>;

    return NextResponse.json({
      success: true,
      status: filter,
      count: rows.length,
      items: rows,
      counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
    });
  } catch (e) {
    console.error('admin fan photos GET failed:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST 單筆：{ id, action:'approve'|'reject', adminNote? }
// POST 批量：{ action, ids:number[], adminNote? } —— 強制只改 pending，冪等跳過已審項
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const body = await request.json();
    const action = body?.action;
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve/reject' }, { status: 400 });
    }
    const nextStatus = action === 'approve' ? 'published' : 'rejected';
    const adminNote = String(body.adminNote ?? '').slice(0, 500) || null;
    const sql = getSql();

    // 批量分支（先判斷，避開單筆 id guard 擋陣列請求嘅 400 陷阱）
    if (Array.isArray(body.ids)) {
      const ids = Array.from(
        new Set((body.ids as unknown[]).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))
      );
      if (!ids.length) return NextResponse.json({ error: 'no valid ids' }, { status: 400 });
      if (ids.length > 500) return NextResponse.json({ error: 'max 500 ids per batch' }, { status: 400 });

      const rows = (await sql.query(
        `UPDATE actress_fan_photos
           SET status = $1, admin_note = COALESCE($2, admin_note),
               reviewed_at = now()
         WHERE status = 'pending' AND id = ANY($3)
         RETURNING id, status, actress_id, blob_url`,
        [nextStatus, adminNote, ids]
      )) as Array<Record<string, unknown>>;

      const changed = new Set(rows.map((r) => Number(r.id)));
      const skipped = ids.filter((i) => !changed.has(i));
      return NextResponse.json({
        success: true,
        requested: ids.length,
        updated: rows.length,
        skipped,
        action,
      });
    }

    // 單筆
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'id (positive integer) required' }, { status: 400 });
    }
    const rows = (await sql.query(
      `UPDATE actress_fan_photos
         SET status = $1, admin_note = COALESCE($2, admin_note), reviewed_at = now()
       WHERE id = $3 AND status = 'pending'
       RETURNING id, status, actress_id, blob_url`,
      [nextStatus, adminNote, id]
    )) as Array<Record<string, unknown>>;

    if (!rows.length) {
      return NextResponse.json({ error: '找不到 pending 項目（可能已審批）' }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: rows[0] });
  } catch (e) {
    console.error('admin fan photos POST failed:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
