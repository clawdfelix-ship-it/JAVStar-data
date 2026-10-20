import { getSql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/events/[id] — 單場活動詳情（含 program_json 節目內容）
// 冇 program 就只回基本欄位（前端自行降級）。
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !/^[a-zA-Z0-9_\-]+$/.test(id)) {
      return NextResponse.json({ error: 'bad id' }, { status: 400 });
    }
    const rows: unknown[] = await (getSql() as any).query(
      `SELECT e.id, e.title, e.venue, e.prefecture, e.event_type, e.url, e.organizer,
              e.date_iso, e.created_at, e.program_json,
              a.id AS actress_id, a.name_ja, a.name_cn, a.avatar_url
       FROM events e LEFT JOIN actresses a ON e.actress_id = a.id
       WHERE e.id = $1 LIMIT 1`,
      [id]
    );
    const row = (rows as any[])[0];
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const iso = row.date_iso ? new Date(row.date_iso).toISOString().slice(0, 10) : null;
    return NextResponse.json({
      data: {
        id: row.id,
        title: row.title,
        venue: row.venue,
        prefecture: row.prefecture,
        event_type: row.event_type,
        url: row.url,
        organizer: row.organizer,
        date_iso: iso,
        actress_id: row.actress_id,
        actress_name: row.name_ja || row.name_cn,
        actress_ja: row.name_ja,
        actress_avatar: row.avatar_url,
        program: row.program_json || null,
      },
    });
  } catch (e) {
    console.error('event detail error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}