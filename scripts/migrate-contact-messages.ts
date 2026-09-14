/**
 * 廣告查詢/合作表單 migration（2026-09-14）
 *
 * /contact 公開表單收集 → 先存入庫（發信 email 遲啲接通）。
 * idempotent：重跑安全。
 *
 * Usage: npx tsx scripts/migrate-contact-messages.ts
 */
import { neon } from '@neondatabase/serverless';
try { process.loadEnvFile(); } catch {}
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('📨 contact_messages migration');

  await sql`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id          BIGSERIAL PRIMARY KEY,
      name        TEXT,                                    -- 稱呼／品牌（選填）
      contact     TEXT        NOT NULL,                   -- 對方聯絡方法
      topic       TEXT        DEFAULT '合作查詢',          -- 查詢類型
      message     TEXT        NOT NULL,                   -- 查詢內容
      ip          TEXT,                                   -- 簡易限流用
      status      TEXT        NOT NULL DEFAULT 'new',     -- new/read/archived
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages (status, created_at DESC)`;

  console.log('   ✅ table + index ready');
}

main()
  .then(() => { console.log('done'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
