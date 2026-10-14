import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables, ingestAuthed } from '@/lib/fanNotify';

export const dynamic = 'force-dynamic';

// Bot 專用：粉絲開 deep-link /start fan_<code> 後，bot 回報綁定 chat_id。
// Header x-ingest-token 必需。冪等＋原子：只接受 pending 且未過期嘅碼。
// POST { bind_code, chat_id, tg_handle? } → { ok, actress_id }
export async function POST(req: NextRequest) {
  if (!ingestAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await ensureFanNotifyTables();
    const b = await req.json();
    const code = String(b.bind_code || '').trim();
    const chatId = Number(b.chat_id);
    if (!/^[A-Za-z0-9_-]{8,20}$/.test(code) || !Number.isInteger(chatId)) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    const upd = await sql`
      UPDATE fan_tg_links
      SET chat_id=${chatId}, status='bound', consumed_at=now()
      WHERE bind_code=${code}
        AND status='pending'
        AND expires_at > now()
      RETURNING actress_id, region_pref`;
    if ((upd as any[]).length === 0) {
      return NextResponse.json({ error: '碼已使用或過期，請喺網頁重新撳一次' }, { status: 404 });
    }
    const row = (upd as any[])[0];

    // 同步落 fan_subscriptions：以 tg chat 作為持久身份，channel=tg、active。
    // identity_key 用 tg:<chatId>，避免同人多碼重複；tg_handle 僅供顯示。
    const handle = String(b.tg_handle || '').replace(/^@/, '').trim();
    await sql`
      INSERT INTO fan_subscriptions
        (actress_id, tg_handle, identity_key, channel_pref, region_pref, source, status)
      VALUES (${row.actress_id}, ${handle || ('tg:' + chatId)}, ${'tg:' + chatId},
              'tg', ${row.region_pref}, 'jching-tg', 'active')
      ON CONFLICT (actress_id, identity_key)
      DO UPDATE SET
        tg_handle=COALESCE(NULLIF(EXCLUDED.tg_handle,''), fan_subscriptions.tg_handle),
        channel_pref='tg', region_pref=EXCLUDED.region_pref,
        status='active', updated_at=now()`;

    return NextResponse.json({ ok: true, actress_id: row.actress_id });
  } catch (e) {
    console.error('bind-confirm', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
