import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// One-time idempotent DDL so this route works without a separate /api/setup call.
// Module-level guard means the DDL runs at most once per serverless cold start.
let _ddlDone = false;
async function ensureTables() {
  if (_ddlDone) return;
  await sql`
    CREATE TABLE IF NOT EXISTS fan_subscriptions (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      actress_id      TEXT NOT NULL,
      email           TEXT,
      tg_handle       TEXT,
      ig_handle       TEXT,
      identity_key    TEXT,
      channel_pref    TEXT NOT NULL DEFAULT 'tg',
      region_pref     TEXT NOT NULL DEFAULT 'hk',
      source          TEXT NOT NULL DEFAULT 'jching',
      fan_token       TEXT,
      ip_address      TEXT,
      status          TEXT NOT NULL DEFAULT 'active',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS fan_subs_token_idx   ON fan_subscriptions(fan_token)`;
  await sql`CREATE INDEX IF NOT EXISTS fan_subs_actress_idx ON fan_subscriptions(actress_id, status)`;
  // For ON CONFLICT inference Postgres needs a real unique *constraint*
  // (not just a partial unique index). ADD CONSTRAINT has no IF NOT EXISTS,
  // so swallow the duplicate-object error (42P16) using a tolerant query.
  try {
    await sql`ALTER TABLE fan_subscriptions
              ADD CONSTRAINT fan_subs_identity_unique UNIQUE (actress_id, identity_key)`;
  } catch (e: any) {
    // 42P07 = duplicate_table/relation ("constraint already exists"); tolerate idempotent re-run.
    if (e?.code !== '42P07' && e?.code !== '42710' && e?.code !== '23505') throw e;
  }
  await sql`
    CREATE TABLE IF NOT EXISTS fan_events (
      id            BIGSERIAL PRIMARY KEY,
      fan_token     TEXT,
      shopify_gid   TEXT,
      source        TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      actress_id    TEXT,
      event_id      TEXT,
      payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS fan_events_token_idx ON fan_events(fan_token, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS fan_events_gid_idx    ON fan_events(shopify_gid, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS fan_events_type_idx   ON fan_events(event_type, created_at DESC)`;
  _ddlDone = true;
}

// 三平台整合 Phase 1：女優「港台場通知」追蹤
// POST body:
//   { actress_id, tg_handle?, ig_handle?, email?, channel_pref?, region_pref?, fan_token?, action?: 'follow'|'unfollow' }
// 規則：至少一個聯絡渠道；identity_key 用最優渠道去重用；冪等 upsert。

type Body = {
  actress_id?: string;
  tg_handle?: string;
  ig_handle?: string;
  email?: string;
  channel_pref?: string;
  region_pref?: string;
  fan_token?: string;
  action?: 'follow' | 'unfollow';
};

function clean(s: unknown): string {
  return String(s ?? '').trim().replace(/^@/, '');
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    ''
  );
}

// choose one stable identity (email > tg > ig); identity_key namespaced by channel
function pickIdentity(email: string, tg: string, ig: string): string | null {
  if (email) return 'e:' + email.toLowerCase();
  if (tg) return 't:' + tg.toLowerCase();
  if (ig) return 'i:' + ig.toLowerCase();
  return null;
}

const CHANNELS = new Set(['tg', 'ig', 'email']);
const REGIONS = new Set(['hk', 'taiwan']);

export async function POST(req: NextRequest) {
  try {
    await ensureTables();

    const b = (await req.json()) as Body;
    const actressId = clean(b.actress_id);
    if (!/^\d+$/.test(actressId)) {
      return NextResponse.json({ error: 'invalid actress_id' }, { status: 400 });
    }
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(b.email)) ? clean(b.email).toLowerCase() : '';
    const tg = clean(b.tg_handle);
    const ig = clean(b.ig_handle);
    if (!email && !tg && !ig) {
      return NextResponse.json({ error: '請至少留一個聯絡方法（Telegram / IG / Email）' }, { status: 400 });
    }
    const action = b.action === 'unfollow' ? 'unfollow' : 'follow';
    const identityKey = pickIdentity(email, tg, ig);
    const channelPref = (b.channel_pref || 'tg')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => CHANNELS.has(c))
      .join(',') || 'tg';
    const regionPref = (b.region_pref || 'hk')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => REGIONS.has(c))
      .join(',') || 'hk';
    const fanToken = clean(b.fan_token);
    const ip = clientIp(req);

    // actress must exist
    const exists = await sql`SELECT 1 FROM actresses WHERE id = ${actressId} LIMIT 1`;
    if ((exists as any[]).length === 0) {
      return NextResponse.json({ error: 'actress not found' }, { status: 404 });
    }

    if (action === 'unfollow' && identityKey) {
      await sql`
        UPDATE fan_subscriptions
        SET status='unsubscribed', updated_at=now()
        WHERE actress_id=${actressId} AND identity_key=${identityKey}`;
      await sql`
        INSERT INTO fan_events (fan_token, source, event_type, actress_id, payload, ip_address)
        VALUES (${fanToken || null}, 'jching', 'unfollow_actress', ${actressId},
                ${JSON.stringify({ identity: identityKey, region: regionPref })}::jsonb, ${ip})`;
      return NextResponse.json({ success: true, status: 'unsubscribed' });
    }

    // upsert by (actress_id, identity_key)
    await sql`
      INSERT INTO fan_subscriptions
        (actress_id, email, tg_handle, ig_handle, identity_key, channel_pref, region_pref,
         source, fan_token, ip_address, status)
      VALUES (${actressId}, ${email || null}, ${tg || null}, ${ig || null}, ${identityKey},
              ${channelPref}, ${regionPref}, 'jching', ${fanToken || null}, ${ip}, 'active')
      ON CONFLICT (actress_id, identity_key)
      DO UPDATE SET
        email=EXCLUDED.email, tg_handle=EXCLUDED.tg_handle, ig_handle=EXCLUDED.ig_handle,
        channel_pref=EXCLUDED.channel_pref, region_pref=EXCLUDED.region_pref,
        fan_token=COALESCE(EXCLUDED.fan_token, fan_subscriptions.fan_token),
        status='active', updated_at=now()`;

    await sql`
      INSERT INTO fan_events (fan_token, source, event_type, actress_id, payload, ip_address)
      VALUES (${fanToken || null}, 'jching', 'follow_actress', ${actressId},
              ${JSON.stringify({ identity: identityKey, channel: channelPref, region: regionPref })}::jsonb, ${ip})`;

    return NextResponse.json({
      success: true,
      message: '已開啟通知！呢位女優一有香港/台灣場，會第一時間話你知 🔔',
    });
  } catch (e) {
    console.error('follow error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

// GET ?actress_id=&email=|tg_handle=|ig_handle=  → 是否已追蹤
export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const sp = req.nextUrl.searchParams;
    const actressId = clean(sp.get('actress_id'));
    const email = clean(sp.get('email')).toLowerCase();
    const tg = clean(sp.get('tg_handle'));
    const ig = clean(sp.get('ig_handle'));
    const identity = pickIdentity(email, tg, ig);
    if (!/^\d+$/.test(actressId) || !identity) {
      return NextResponse.json({ following: false });
    }
    const rows = await sql`
      SELECT status FROM fan_subscriptions
      WHERE actress_id=${actressId} AND identity_key=${identity} LIMIT 1`;
    return NextResponse.json({ following: (rows as any[])[0]?.status === 'active' });
  } catch (e) {
    console.error('follow status error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
