import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables, ingestAuthed, formatProgramBrief } from '@/lib/fanNotify';

export const dynamic = 'force-dynamic';

// Bot 專用：`/fanpull <pull_code>` 時呼叫。原子地把 pending 批次標記 pulled
// （單次使用；再拉同一碼 → 410 gone），回傳完整收件 chat_id 列表＋訊息正文。
// Bot 收到後自行逐個 sendMessage，並可呼叫 /api/fan/notify-result 回報結果。
// POST { pull_code } → { message, chats:[ids], event_id, title }
export async function POST(req: NextRequest) {
  if (!ingestAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await ensureFanNotifyTables();
    const b = await req.json();
    const code = String(b.pull_code || '').trim();
    if (!/^[A-Za-z0-9_-]{8,20}$/.test(code)) {
      return NextResponse.json({ error: 'bad code' }, { status: 400 });
    }

    const ob = await sql`
      UPDATE fan_notify_outbox
      SET status='pulled', pulled_at=now()
      WHERE pull_code=${code} AND status='pending'
      RETURNING id, event_id, actress_id, title, date, venue, url, region, recipients`;
    if ((ob as any[]).length === 0) {
      const gone = await sql`SELECT 1 FROM fan_notify_outbox WHERE pull_code=${code} LIMIT 1`;
      return NextResponse.json(
        { error: (gone as any[]).length ? '此碼已使用（單次有效）' : '搵唔到批次' },
        { status: (gone as any[]).length ? 410 : 404 });
    }
    const row = (ob as any[])[0];

    const rs = await sql`SELECT chat_id FROM fan_notify_recipients WHERE outbox_id=${row.id} ORDER BY chat_id`;
    const chats = (rs as any[]).map((r) => r.chat_id);

    // 帶埋節目詳情（若有 program_json），開票訊息加入場次/票價/限額摘要
    const pr = await sql`SELECT program_json FROM events WHERE id=${row.event_id} LIMIT 1`;
    const program = ((pr as any[])[0]?.program_json) || null;

    const dateHK = String(row.date).slice(0, 10).replace(/-/g, '/');
    const place = row.venue || (row.region === 'taiwan' ? '台灣' : '香港');
    const link = row.url && row.url.startsWith('http')
      ? row.url
      : `https://j-star-data.vercel.app${row.url || ''}`;

    const detail = formatProgramBrief(program);
    const detailLine = detail ? `\n${detail}\n` : '\n';
    const message =
      `🔔【港台場開票通知】\n\n` +
      `${row.title}\n` +
      `📅 ${dateHK}　📍 ${place}\n` +
      detailLine +
      `你之前追蹤咗呢位女優，優先通知你 👇\n${link}\n\n` +
      `（如唔想再收到，可到女優頁取消追蹤）`;

    return NextResponse.json({
      ok: true, event_id: row.event_id, title: row.title,
      recipients: chats.length, chats, message,
    });
  } catch (e) {
    console.error('notify-pull', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
