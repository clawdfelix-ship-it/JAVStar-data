import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/event-submissions?status=pending — 列出補充（admin）
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const allowed = ['pending', 'approved', 'rejected', 'all'];
    const st = allowed.includes(status) ? status : 'pending';

    const rows = st === 'all'
      ? await sql`SELECT * FROM event_submissions ORDER BY created_at DESC LIMIT 200`
      : await sql`SELECT * FROM event_submissions WHERE status = ${st} ORDER BY created_at DESC LIMIT 200`;

    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST body:
//  { action:'approve', id, actressId, eventDate?, location?, title? }
//  { action:'reject',  id, note? }
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });

    const subs = await sql`SELECT * FROM event_submissions WHERE id = ${id}`;
    const sub = (subs as any[])[0];
    if (!sub) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (sub.status !== 'pending') {
      return NextResponse.json({ error: `已經處理過（${sub.status}）` }, { status: 409 });
    }

    if (body.action === 'reject') {
      await sql`UPDATE event_submissions
                  SET status='rejected', admin_note=${String(body.note || '').slice(0, 500)}, reviewed_at=now()
                WHERE id=${id}`;
      return NextResponse.json({ success: true });
    }

    if (body.action === 'approve') {
      // 粉絲提交時已用搜尋配對女優（sub.actress_id）；管理員可在審批台改配對覆蓋
      const actressId = String(body.actressId || sub.actress_id || '').trim();
      if (!/^\d{1,10}$/.test(actressId)) {
        return NextResponse.json({ error: '呢筆未配對到女優，請喺下面搜尋揀一位先上架' }, { status: 400 });
      }
      const found = await sql`SELECT id FROM actresses WHERE id=${actressId} LIMIT 1`;
      if (!(found as any[]).length) {
        return NextResponse.json({ error: '女優 id 不存在' }, { status: 400 });
      }

      // 管理員可微調日期/地點/標題，否則用提交原值
      const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.eventDate || '')) ? body.eventDate : sub.event_date;
      const location = String(body.location || sub.location).slice(0, 200);
      const title = String(body.title || sub.content).slice(0, 300);
      const eventId = `fans-${id}`;
      const sourceUrl = sub.source_url || '';

      await sql`
        INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at, date_iso)
        VALUES (${eventId}, ${actressId}, ${title}, ${eventDate}, '', ${location}, 'other', ${sourceUrl}, now()::text, ${eventDate}::date)
        ON CONFLICT (id) DO UPDATE SET
          actress_id = EXCLUDED.actress_id,
          title = EXCLUDED.title,
          datetime = EXCLUDED.datetime,
          venue = EXCLUDED.venue,
          url = EXCLUDED.url,
          date_iso = EXCLUDED.date_iso
      `;

      // 更新該女優計數（ranking/日曆讀呢張表）
      await sql`
        INSERT INTO actress_events_count (actress_id, year_2025_events, year_2026_events, month_04_2026_events)
        SELECT ${actressId},
          COUNT(*) FILTER (WHERE date_iso >= '2025-01-01' AND date_iso < '2026-01-01')::int,
          COUNT(*) FILTER (WHERE date_iso >= '2026-01-01' AND date_iso < '2027-01-01')::int,
          COUNT(*) FILTER (WHERE date_iso >= date_trunc('month', CURRENT_DATE)::date
                            AND date_iso < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int
        FROM events
        WHERE actress_id = ${actressId} AND date_iso IS NOT NULL
        ON CONFLICT (actress_id) DO UPDATE SET
          year_2025_events = EXCLUDED.year_2025_events,
          year_2026_events = EXCLUDED.year_2026_events,
          month_04_2026_events = EXCLUDED.month_04_2026_events
      `;

      await sql`UPDATE event_submissions
                  SET status='approved', actress_id=${actressId}, created_event_id=${eventId}, reviewed_at=now()
                WHERE id=${id}`;

      return NextResponse.json({ success: true, eventId });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
