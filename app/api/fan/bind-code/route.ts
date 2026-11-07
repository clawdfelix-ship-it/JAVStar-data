import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables, randomCode } from '@/lib/fanNotify';

export const dynamic = 'force-dynamic';

// 公開端點：產生一次性 Telegram deep-link。scope=site 係全站；否則係指定女優。
const BOT_USERNAME = process.env.NEXT_PUBLIC_NOTIFY_BOT_USERNAME || 'jching_calendar_bot';

function regionPref(value: unknown, fallback: string): string {
  const regions = String(value ?? '').split(',').filter((r) => ['hk', 'taiwan'].includes(r));
  return [...new Set(regions)].join(',') || fallback;
}

export async function POST(req: NextRequest) {
  try {
    await ensureFanNotifyTables();
    const b = await req.json();
    const isSite = b.scope === 'site';
    const actressId = String(b.actress_id || '').trim();
    if (!isSite && !/^\d+$/.test(actressId)) {
      return NextResponse.json({ error: 'invalid actress_id' }, { status: 400 });
    }
    const region = regionPref(b.region_pref, isSite ? 'hk,taiwan' : 'hk');
    const code = randomCode();
    if (isSite) {
      await sql`INSERT INTO site_tg_links (bind_code, region_pref, status) VALUES (${code}, ${region}, 'pending')`;
    } else {
      await sql`INSERT INTO fan_tg_links (bind_code, actress_id, region_pref, status) VALUES (${code}, ${actressId}, ${region}, 'pending')`;
    }
    const scope = isSite ? 'site' : 'fan';
    const deeplink = `https://t.me/${BOT_USERNAME}?start=${scope}_${code}`;
    return NextResponse.json({ bind_code: code, deeplink, bot: BOT_USERNAME, scope: isSite ? 'site' : 'actress' });
  } catch (e) {
    console.error('bind-code', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
