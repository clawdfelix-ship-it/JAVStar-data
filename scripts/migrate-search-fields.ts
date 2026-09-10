/**
 * Phase 2 搜尋升級 migration（2026-09-10，搜尋藍圖方案 1+2+3）
 *
 * 加欄：
 *   name_kana    — 從 name_cn 拆出嘅假名讀音
 *   name_romaji  — 羅馬字（lower、去 macron）
 *   aliases      — 其他別名（中文譯名、系列名等）
 *   search_text  — 原名+假名+羅馬字+別名拼出嘅可搜文字
 *   search_norm  — search_text 嘅簡體/異體字正規化版（OpenCC 喺 script 層生成）
 * 索引：
 *   pg_trgm GIN ×2（search_text / search_norm）→ ILIKE '%q%' 行 index + similarity()
 *
 * Usage: npx tsx scripts/migrate-search-fields.ts   （idempotent）
 */
import { neon } from '@neondatabase/serverless';
try { process.loadEnvFile(); } catch {}
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('🔍 Phase 2 search fields migration');

  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  console.log('   ✅ pg_trgm extension');

  await sql`ALTER TABLE actresses ADD COLUMN IF NOT EXISTS name_kana   TEXT`;
  await sql`ALTER TABLE actresses ADD COLUMN IF NOT EXISTS name_romaji TEXT`;
  await sql`ALTER TABLE actresses ADD COLUMN IF NOT EXISTS aliases     TEXT[]`;
  await sql`ALTER TABLE actresses ADD COLUMN IF NOT EXISTS search_text TEXT`;
  await sql`ALTER TABLE actresses ADD COLUMN IF NOT EXISTS search_norm TEXT`;
  console.log('   ✅ columns: name_kana / name_romaji / aliases / search_text / search_norm');

  await sql`CREATE INDEX IF NOT EXISTS idx_actresses_search_text_trgm
            ON actresses USING gin (search_text gin_trgm_ops)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_actresses_search_norm_trgm
            ON actresses USING gin (search_norm gin_trgm_ops)`;
  console.log('   ✅ trigram GIN indexes');

  // 安全網：scraper/seed 嘅 INSERT 唔識填 search_text 時，trigger 用原名兜底，
  // 令新 row 至少可以用 name_ja/name_cn 搜到（完整正規化靠 backfill script 補跑）。
  await sql`
    CREATE OR REPLACE FUNCTION actresses_search_fallback() RETURNS trigger AS $$
    BEGIN
      IF NEW.search_text IS NULL THEN
        NEW.search_text := lower(concat_ws(' ', NEW.name_ja, NEW.name_cn));
      END IF;
      IF NEW.search_norm IS NULL THEN
        NEW.search_norm := lower(concat_ws(' ', NEW.name_ja, NEW.name_cn));
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`;
  await sql`DROP TRIGGER IF EXISTS trg_actresses_search_fallback ON actresses`;
  await sql`CREATE TRIGGER trg_actresses_search_fallback
           BEFORE INSERT OR UPDATE OF name_ja, name_cn ON actresses
           FOR EACH ROW EXECUTE FUNCTION actresses_search_fallback()`;
  console.log('   ✅ fallback trigger for new scraper rows');

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
     WHERE table_name='actresses'
       AND column_name IN ('name_kana','name_romaji','aliases','search_text','search_norm')
     ORDER BY 1`;
  console.log('   verify columns:', cols.map((c: any) => c.column_name).join(', '));
}

main().then(() => console.log('done.')).catch((e) => { console.error(e); process.exit(1); });
