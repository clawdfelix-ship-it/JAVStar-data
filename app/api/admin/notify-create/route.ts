import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables, ingestAuthed, randomCode } from '@/lib/fanNotify';

export const dynamic = 'force-dynamic';

// Admin（/admin/fans）：為某場活動建立一輪 Telegram 通知批次。
// POST { event_id } → { pull_code, recipients, title, url, ... }
// 冪等：同一 event_id 若已有未拉取批次，重用；已拉取則報錯（要人手 reissue）。
export async function POST(req: NextRequest) {
  if (!ingestAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await ensureFanNotifyTables();
    const b = await req.json();
    const eventId = String(b.event_id || '').trim();
    if (!/^javstar-\d{6,}-\d{8}-(meet|photo|off|flash)$/.test(eventId)) {
      return NextResponse.json({ error: 'invalid event_id' }, { status: 400 });
    }

    const ev = await sql`SELECT id, actress_id, title, date_iso, venue, prefecture, url
                         FROM events WHERE id=${eventId} LIMIT 1`;
    if ((ev as any[]).length === 0) return NextResponse.json({ error: 'event not found' }, { status: 404 });
    const e = (ev as any[])[0];
    const pf: string = e.prefecture || '';
    const region = pf.includes('台') || pf.includes('臺') ? 'taiwan' : 'hk';
    const dateStr = e.date_iso instanceof Date ? e.date_iso.toISOString().slice(0, 10) : String(e.date_iso).slice(0, 10);

    // 受眾：channel 含 tg、active、追蹤該女優、地區偏好包含本場地區；
    // chat_id 以 identity_key='tg:<id>' 還原（bind-confirm 寫法）。
    const recips = await sql`
      SELECT DISTINCT split_part(s.identity_key, ':', 2)::bigint AS chat_id
      FROM fan_subscriptions s
      WHERE s.actress_id=${e.actress_id}
        AND s.status='active'
        AND s.identity_key LIKE 'tg:%'
        AND (',' || s.region_pref || ',') LIKE ${'%,' + region + ',%'}`;
    const chats = (recips as any[]).map((r) => r.chat_id).filter(Boolean);
    if (chats.length === 0) {
      return NextResponse.json({ error: '沒有可發送嘅 Telegram 訂閱者', recipients: 0 }, { status: 422 });
    }

    // 重用未拉取批次
    const exist = await sql`
      SELECT id, pull_code, recipients FROM fan_notify_outbox
      WHERE event_id=${eventId} AND status='pending' LIMIT 1`;
    if ((exist as any[]).length > 0) {
      const x = (exist as any[])[0];
      return NextResponse.json({ reused: true, pull_code: x.pull_code, recipients: x.recipients, ...payload(e) });
    }

    const code = randomCode(8);
    await sql`
      INSERT INTO fan_notify_outbox (event_id, actress_id, title, date, venue, url, region, pull_code, recipients)
      VALUES (${e.id},${e.actress_id},${e.title},${dateStr},${e.venue || null},${e.url},${region},${code},${chats.length})`;

    // 收件 chat list
    const ob = await sql`SELECT id FROM fan_notify_outbox WHERE event_id=${eventId} AND status='pending' LIMIT 1`;
    const outboxId = (ob as any[])[0].id;
    for (const cid of chats) {
      await sql`INSERT INTO fan_notify_recipients (outbox_id, chat_id) VALUES (${outboxId},${cid})
                ON CONFLICT DO NOTHING`;
    }

    return NextResponse.json({ pull_code: code, recipients: chats.length, ...payload(e) });
  } catch (err) {
    console.error('notify-create', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

function payload(e: any) {
  return { event_id: e.id, title: e.title, date: String(e.date_iso).slice(0, 10), venue: e.venue, url: e.url };
}
