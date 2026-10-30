import sql from '@/lib/db';
import { matchesToken } from '@/lib/token-auth';

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
  const provided = req.headers.get('x-ingest-token');
  return matchesToken(provided, process.env.INGEST_TOKEN);
}

// 由 events.program_json 組一行簡短開票摘要（場次/票價/限額），供 Telegram 開票通知用。
// 設計：簡短（Telegram 唔好太長）、唔標加購細項、冇 program 時回 ''。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatProgramBrief(program: any): string {
  if (!program || typeof program !== 'object') return '';
  const lines: string[] = [];

  // 攝影會：列出場次（時間 + 價 + 限額）
  if (Array.isArray(program.sessions) && program.sessions.length) {
    const seen = new Set<string>();
    for (const s of program.sessions) {
      if (!s || typeof s !== 'object') continue;
      const price = typeof s.price === 'number' ? `$${s.price}` : '';
      const cap = s.capacity_text ? String(s.capacity_text) : '';
      const label = [s.slot, s.time].filter(Boolean).join(' ');
      const line = `・${label}${price ? ' ' + price : ''}${cap ? '（' + cap + '）' : ''}`.trim();
      if (line !== '・' && !seen.has(line)) { seen.add(line); lines.push(line); }
    }
  }

  // OFF 會：單一時間 + 票價 + 限量
  if (program.kind === 'off' || (program.time && program.capacity_text && !program.sessions)) {
    const price = typeof program.price === 'number' ? `$${program.price}` : '';
    lines.push(`・${[program.time, price, program.capacity_text].filter(Boolean).join(' ')}`);
  }

  // 快閃：套餐價
  if (program.package && typeof program.package.price === 'number') {
    lines.push(`・${program.package.name || '快閃套餐'} $${program.package.price}`);
  }

  // 見面會：入場票價 + 場數
  if (program.entry_ticket && typeof program.entry_ticket.price === 'number') {
    const n = Array.isArray(program.sessions) ? `${program.sessions.length} 場` : '';
    lines.push(`・入場券 $${program.entry_ticket.price}${n ? '（' + n + '，特典券現場加購）' : ''}`);
  }

  return lines.slice(0, 6).join('\n');
}
