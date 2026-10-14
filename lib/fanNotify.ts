import sql from '@/lib/db';
import { hasIngestToken } from '@/lib/token-auth';

// ─────────────────────────────────────────────────────────────
// JCHING 港台場通知閉環（Telegram）
//
// fan_tg_links   一次性 deep-link 碼 → Telegram chat_id 綁定
// fan_notify_outbox  每場活動待發／已發通知（bot /fanpull 拉取發送）
//
// 安全模型：
//  - 綁定碼 bind_code：12 位隨機、15 分鐘有效、用一次即失效（consumed_at）
//  - pull_code（admin 發送批次）：單次有效、consumed 後再拉會 410
//  - 所有 inbound/pull endpoint 都要 INGEST_TOKEN（bot 只持有 server-side 常數）
//  - bot 唔使識 JCHING schema，只做 HTTP；唔郁 bot 自己嘅 PG
// ─────────────────────────────────────────────────────────────

let _ddl = false;
export async function ensureFanNotifyTables() {
  if (_ddl) return;
  await sql`
    CREATE TABLE IF NOT EXISTS fan_tg_links (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      bind_code     TEXT NOT NULL UNIQUE,
      actress_id    TEXT NOT NULL,
      chat_id       BIGINT,
      region_pref   TEXT NOT NULL DEFAULT 'hk',
      status        TEXT NOT NULL DEFAULT 'pending',  -- pending|bound|expired
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
      consumed_at   TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS fan_tg_links_chat_idx ON fan_tg_links(chat_id) WHERE chat_id IS NOT NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS fan_notify_outbox (
      id            BIGSERIAL PRIMARY KEY,
      event_id      TEXT NOT NULL UNIQUE,
      actress_id    TEXT NOT NULL,
      title         TEXT NOT NULL,
              date          TEXT NOT NULL,
      venue         TEXT,
      url           TEXT,
      region        TEXT NOT NULL DEFAULT 'hk',
      status        TEXT NOT NULL DEFAULT 'pending',  -- pending|pulled
      pull_code     TEXT,
      recipients    INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      pulled_at     TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS fan_outbox_pull_idx ON fan_notify_outbox(pull_code) WHERE pull_code IS NOT NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS fan_notify_recipients (
      outbox_id BIGINT NOT NULL,
      chat_id   BIGINT NOT NULL,
      sent      BOOLEAN NOT NULL DEFAULT false,
      failed    BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY (outbox_id, chat_id)
    )`;
  _ddl = true;
}

export function randomCode(bytes = 9): string {
  // 12 url-safe chars (no ambiguous separators); crypto via node
  const { randomBytes } = require('node:crypto');
  return randomBytes(bytes).toString('base64url').slice(0, 12);
}

export function ingestAuthed(req: Request): boolean {
  return hasIngestToken(req.headers);
}
