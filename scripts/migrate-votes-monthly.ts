/**
 * Migration: votes → monthly voting (2026-09-01)
 *
 * 舊制：UNIQUE(actress_id, ip_address) — 永久一票（但錯誤訊息寫「每日」）
 * 新制：每月一票 — UNIQUE(actress_id, ip_address, vote_month)
 *   - vote_month TEXT 'YYYY-MM'（server timezone Asia/Hong_Kong 計）
 *   - 舊票 backfill：vote_month = 投出月份（voted_at）；voted_at 異常者歸當前月
 *   - 加 FK votes.actress_id → actresses(id) ON DELETE CASCADE
 *   - 清掉孤兒票（actress 已刪除，例如舊假女優 row）
 *
 * Usage: npx tsx scripts/migrate-votes-monthly.ts
 */
import { neon } from '@neondatabase/serverless';

try { process.loadEnvFile(); } catch {}
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function main() {
  console.log('🗳️  votes → monthly voting migration');

  // 0. 現況
  const before = await sql`SELECT COUNT(*)::int AS n FROM votes`;
  console.log(`   現有票數: ${before[0].n}`);

  // 1. 加 vote_month 欄位（idempotent）
  await sql`ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_month TEXT`;

  // 2. backfill：以投出月份歸檔；parse 唔到/空值嘅舊票歸當前月
  //    （佢哋視為「本月初已投」，下月自動解鎖，語意安全）
  const currentMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' }).slice(0, 7);
  await sql`
    UPDATE votes
       SET vote_month = COALESCE(
             SUBSTRING(voted_at FROM 1 FOR 7),  -- 'YYYY-MM' from 'YYYY-MM-DD HH:MM:SS' / ISO text
             ${currentMonth}
           )
     WHERE vote_month IS NULL
  `;
  console.log(`   backfill 完成（異常/空 voted_at → ${currentMonth}）`);

  // 3. 清孤兒票（FK 目標已不存在，例如舊 timestamp 假女優/auto_* 已刪）
  const orphans = await sql`
    DELETE FROM votes v
     WHERE NOT EXISTS (SELECT 1 FROM actresses a WHERE a.id = v.actress_id)
    RETURNING v.id
  `;
  console.log(`   刪除孤兒票: ${(orphans as any[]).length}`);

  // 4. 同 (actress, ip, month) 有多餘 row（理論上舊 unique 保證唔會，保險起見去重）
  const dedup = await sql`
    DELETE FROM votes v
     USING votes v2
    WHERE v.actress_id = v2.actress_id
      AND v.ip_address  = v2.ip_address
      AND v.vote_month  = v2.vote_month
      AND v.id < v2.id
    RETURNING v.id
  `;
  console.log(`   同月份重複票去重: ${(dedup as any[]).length}`);

  // 5. 換 UNIQUE 約束：永久 → 每月
  await sql`ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_actress_id_ip_address_key`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'votes_actress_ip_month_key'
      ) THEN
        ALTER TABLE votes
          ADD CONSTRAINT votes_actress_ip_month_key
          UNIQUE (actress_id, ip_address, vote_month);
      END IF;
    END $$;
  `;

  // 6. FK → actresses（ON DELETE CASCADE：刪女優時票一齊清）
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'votes_actress_id_fkey'
      ) THEN
        ALTER TABLE votes
          ADD CONSTRAINT votes_actress_id_fkey
          FOREIGN KEY (actress_id) REFERENCES actresses(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;

  // 7. 索引：月榜計數 + 「我今日投咗幾多票」頻率檢查
  await sql`CREATE INDEX IF NOT EXISTS idx_votes_month ON votes (vote_month)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_votes_ip_time ON votes (ip_address, voted_at)`;

  // 8. 驗證
  const after = await sql`
    SELECT vote_month, COUNT(*)::int AS n
      FROM votes GROUP BY vote_month ORDER BY vote_month DESC LIMIT 6
  `;
  console.log('   票數按月分佈（最近6個月）:');
  for (const r of after as any[]) console.log(`     ${r.vote_month}: ${r.n}`);

  const cons = await sql`
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'votes'::regclass ORDER BY conname
  `;
  console.log('   votes 約束:', (cons as any[]).map(c => c.conname).join(', '));
  console.log('✅ migration 完成');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
