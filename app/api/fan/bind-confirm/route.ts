import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables, ingestAuthed } from '@/lib/fanNotify';
import { confirmFanBinding } from '@/lib/fanBindings';

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
    const handle = String(b.tg_handle || '').replace(/^@/, '').trim();
    const actressId = await confirmFanBinding(sql as any, {
      bindCode: code,
      chatId,
      tgHandle: handle || undefined,
    });
    if (!actressId) {
      return NextResponse.json({ error: '碼已使用或過期，請喺網頁重新撳一次' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, actress_id: actressId });
  } catch (e) {
    console.error('bind-confirm', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
