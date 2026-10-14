import { NextRequest, NextResponse } from 'next/server';
import { ensureFanNotifyTables, randomCode } from '@/lib/fanNotify';

export const dynamic = 'force-dynamic';

// 公開端點：粉絲撳「一鍵 Telegram 訂閱」時，生成一次性 deep-link 碼。
// POST { actress_id, region_pref? } → { bind_code, deeplink }
// Bot username 由 env 提供（唔 hardcode 喺多處）。
const BOT_USERNAME = process.env.NEXT_PUBLIC_NOTIFY_BOT_USERNAME || 'javstarmeet_vip_bot';

export async function POST(req: NextRequest) {
  try {
    await ensureFanNotifyTables();
    const b = await req.json();
    const actressId = String(b.actress_id || '').trim();
    if (!/^\d+$/.test(actressId)) {
      return NextResponse.json({ error: 'invalid actress_id' }, { status: 400 });
    }
    const region = ['hk', 'taiwan'].includes(b.region_pref) ? b.region_pref : 'hk';
    const code = randomCode();
    await sqlInsert(code, actressId, region);
    const deeplink = `https://t.me/${BOT_USERNAME}?start=fan_${code}`;
    return NextResponse.json({ bind_code: code, deeplink, bot: BOT_USERNAME });
  } catch (e) {
    console.error('bind-code', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

async function sqlInsert(code: string, actressId: string, region: string) {
  const sql = (await import('@/lib/db')).default;
  await sql`
    INSERT INTO fan_tg_links (bind_code, actress_id, region_pref, status)
    VALUES (${code}, ${actressId}, ${region}, 'pending')`;
}
