/**
 * Backfill 女優搜尋欄（Phase 2，2026-09-10）
 * 讀全部 actresses → normalizeNames → 分批 UPDATE
 * 用法：npx tsx scripts/backfill-search-fields.ts   （可重跑）
 */
import { neon } from '@neondatabase/serverless';
try { process.loadEnvFile(); } catch {}
const sql = neon(process.env.DATABASE_URL!);

import { normalizeNames } from '../lib/name-normalize';

async function main() {
  const newOnly = process.argv.includes('--new-only');
  let rows: any[];
  if (newOnly) {
    // trigger 只會填兜底 search_text；撈出未做完整正規化（冇羅馬字但 name_cn 含 / 格式，
    // 或 search_text 明顯缺失）嘅 row
    rows = await sql`SELECT id, name_ja, name_cn FROM actresses
      WHERE search_text IS NULL OR search_text = ''
         OR (name_cn LIKE '%/%' AND name_romaji IS NULL)
      ORDER BY id`;
    if (!rows.length) { console.log('✅ 無需補資料嘅女優'); return; }
  } else {
    rows = await sql`SELECT id, name_ja, name_cn FROM actresses ORDER BY id`;
  }
  console.log(`🔍 ${newOnly ? 'incremental ' : ''}backfill ${rows.length} actresses`);

  let updated = 0;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await sql.transaction(batch.map((r: any) => {
      const n = normalizeNames(r.name_ja, r.name_cn);
      return sql`UPDATE actresses SET
        name_kana   = ${n.name_kana},
        name_romaji = ${n.name_romaji},
        aliases     = ${n.aliases}::text[],
        search_text = ${n.search_text},
        search_norm = ${n.search_norm}
      WHERE id = ${r.id}`;
    }));
    updated += batch.length;
    if (updated % 1000 < BATCH) console.log(`   ...${updated}/${rows.length}`);
  }
  console.log(`✅ done, ${updated} rows`);

  // sanity stats
  const stat = await sql`SELECT
    COUNT(*)::int total,
    COUNT(name_kana)::int with_kana,
    COUNT(name_romaji)::int with_romaji
  FROM actresses`;
  console.log('   stats:', stat[0]);
}

main().catch((e) => { console.error(e); process.exit(1); });
