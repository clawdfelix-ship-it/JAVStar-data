/**
 * 粉絲補充活動資料 migration（2026-09-11）
 *
 * 公開表單收集 → status=pending → Felix 喺 admin 頁批核 → 批准後寫入 events。
 * idempotent：重跑安全。
 *
 * Usage: npx tsx scripts/migrate-event-submissions.ts
 */
import { neon } from '@neondatabase/serverless';
try { process.loadEnvFile(); } catch {}
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('📝 event_submissions migration');

  await sql`
    CREATE TABLE IF NOT EXISTS event_submissions (
      id               BIGSERIAL PRIMARY KEY,
      event_date       DATE        NOT NULL,            -- 活動日期
      actress_name     TEXT        NOT NULL,            -- 女優（粉絲填，可能配對唔到庫中女優）
      location         TEXT        NOT NULL,            -- 地點
      content          TEXT        NOT NULL,            -- 內容
      source_url       TEXT,                            -- 資料來源連結/群組
      contact          TEXT,                            -- 粉絲聯絡（選填）
      status           TEXT        NOT NULL DEFAULT 'pending', -- pending/approved/rejected
      ip               TEXT,                            -- 簡易限流用
      admin_note       TEXT,                            -- 批核備註（尤其拒絕原因）
      actress_id       TEXT,                            -- 批核時配對到嘅女優 id
      created_event_id TEXT,                            -- 批准後寫入 events 嘅 id
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at      TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_submissions_status_created ON event_submissions (status, created_at DESC)`;

  console.log('   ✅ table + index ready');
}

main()
  .then(() => { console.log('done'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
