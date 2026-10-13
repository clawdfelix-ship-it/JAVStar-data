// One-off idempotent migration for fan foundation tables. Run: node scripts/init-fan-tables.mjs
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

// minimal .env.local loader
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) throw new Error('no db url');
const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS fan_subscriptions (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actress_id      TEXT NOT NULL,
    email           TEXT,
    tg_handle       TEXT,
    ig_handle       TEXT,
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
// dedupe: one active subscription per (actress, fan contact identity). Use a
// normalized identity column so the same person across channels isn't duped.
await sql`ALTER TABLE fan_subscriptions ADD COLUMN IF NOT EXISTS identity_key TEXT`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS fan_subs_identity_uq
  ON fan_subscriptions(actress_id, identity_key) WHERE identity_key IS NOT NULL`;
await sql`CREATE INDEX IF NOT EXISTS fan_subs_actress_idx ON fan_subscriptions(actress_id, status)`;
await sql`CREATE INDEX IF NOT EXISTS fan_subs_token_idx   ON fan_subscriptions(fan_token)`;

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

const t = await sql`SELECT to_char(now(),'YYYY-MM-DD HH24:MI:SS') AS now`;
console.log('OK fan tables ready at', t[0].now);
