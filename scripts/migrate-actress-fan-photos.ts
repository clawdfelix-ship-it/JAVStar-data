/**
 * 女優粉絲相冊 migration（2026-11-06）
 *
 * 公開上傳（含 client 端壓縮至 ≤3MB JPEG）→ status=pending → Felix 喺 admin 審批
 * → approved 先喺女優頁公開。圖片存 Vercel Blob，DB 只存 URL。
 *
 * idempotent：重跑安全（IF NOT EXISTS）。
 * Usage: npx tsx --env-file=.env.local scripts/migrate-actress-fan-photos.ts
 */
import { neon } from '@neondatabase/serverless';
try { process.loadEnvFile(); } catch {}
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('📝 actress_fan_photos migration');

  // Neon serverless 對多語句 prepared statement 敏感，逐句執行（同 news migration 一樣）
  await sql`
    CREATE TABLE IF NOT EXISTS actress_fan_photos (
      id                BIGSERIAL PRIMARY KEY,
      actress_id        TEXT        NOT NULL,
      event_id          TEXT,
      blob_url          TEXT        NOT NULL,
      thumbnail_url     TEXT,
      caption           TEXT,
      submitter_contact TEXT        NOT NULL,
      submitter_name    TEXT,
      ip                TEXT,
      status            TEXT        NOT NULL DEFAULT 'pending',
      admin_note        TEXT,
      width             INTEGER,
      height            INTEGER,
      file_size         INTEGER,
      mime_type         TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at       TIMESTAMPTZ,
      reviewed_by       TEXT,
      CONSTRAINT fk_fanphoto_actress
        FOREIGN KEY (actress_id) REFERENCES actresses(id) ON DELETE CASCADE
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_afp_actress_status
    ON actress_fan_photos (actress_id, status, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_afp_status_created
    ON actress_fan_photos (status, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_afp_ip_created
    ON actress_fan_photos (ip, created_at DESC)`;

  console.log('   ✅ table + indexes ready');
}

main()
  .then(() => { console.log('done'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
