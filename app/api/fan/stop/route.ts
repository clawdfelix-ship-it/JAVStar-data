import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables, ingestAuthed } from '@/lib/fanNotify';

export const dynamic = 'force-dynamic';

// Bot 專用：用戶喺 @jching_calendar_bot 打 /stop，取消佢呢個 chat 嘅所有 Telegram 通知。
// 會同時退全站訂閱（site_subscriptions）同所有女優 tgchat: 訂閱（fan_subscriptions）。
// 手動 t:<handle> 行（無真 chat_id、唔可推送）唔會被改。
// POST { chat_id } → { site, actress }
export async function POST(req: NextRequest) {
  if (!ingestAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await ensureFanNotifyTables();
    const b = await req.json();
    const chatId = Number(b.chat_id);
    if (!Number.isInteger(chatId) || chatId <= 0) {
      return NextResponse.json({ error: 'bad chat_id' }, { status: 400 });
    }

    const site = await sql`
      UPDATE site_subscriptions
      SET status='unsubscribed', updated_at=now()
      WHERE chat_id=${chatId} AND status='active'
      RETURNING chat_id`;

    const actress = await sql`
      UPDATE fan_subscriptions
      SET status='unsubscribed', updated_at=now()
      WHERE identity_key=${'tgchat:' + chatId} AND status='active'
      RETURNING actress_id`;

    return NextResponse.json({
      ok: true,
      site: (site as any[]).length,
      actress: (actress as any[]).length,
    });
  } catch (e) {
    console.error('fan stop', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
