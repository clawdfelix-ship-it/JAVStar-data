/**
 * 修復：片商品牌名（プレステージ 等）被當女優名配對事件（2026-09-12，Felix 發現 /actress/605347）
 *
 * 病因：actresses.name_cn / aliases 含片商名（605347 みなみ name_cn=プレステージ），
 * daily-scraper relinkUnknownEvents 見標題前綴【プレステージ】即錯配，11 個
 * 「専属 {真女優}」品牌活動全部掛錯。
 *
 * 本 script（idempotent）：
 * 1) 將 actress_id=605347 且標題「専属 {name}」嘅事件，改掛真女優（exact match）。
 * 2) 清除女優 aliases / name_cn 內嘅片商名污染，重建 search_text/search_norm。
 * 3) 重建受影響女優 events_count（含 605347 歸零）。
 *
 * 用法：npx tsx scripts/fix-studio-label-mislink.ts [--apply]
 */
try { process.loadEnvFile(); } catch {}

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');

// 片商／廠牌名，唔可以當女優名參與配對（scraper 黑名單同一份）
const STUDIO_LABELS = [
  'プレステージ', '本中', '溜池ゴロー', 'S1', 'MOODYZ', 'マドンナ',
  'アイデアポケット', 'アタッカーズ', 'FALENO', 'ダスッ！', 'ワンズファクトリー',
  'OPPAI', 'E-BODY', 'kira☆kira', 'kawaii', 'ナンパJAPAN',
];

async function rebuildCounts(ids: string[]) {
  if (!ids.length) return;
  await sql`
    INSERT INTO actress_events_count (actress_id, year_2025_events, year_2026_events, month_04_2026_events)
    SELECT actress_id,
      COUNT(*) FILTER (WHERE date_iso >= '2025-01-01' AND date_iso <  '2026-01-01')::int,
      COUNT(*) FILTER (WHERE date_iso >= '2026-01-01' AND date_iso <  '2027-01-01')::int,
      COUNT(*) FILTER (WHERE date_iso >= date_trunc('month', CURRENT_DATE)::date
                        AND date_iso <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int
    FROM events WHERE actress_id = ANY(${ids})
    GROUP BY actress_id
    ON CONFLICT (actress_id) DO UPDATE SET
      year_2025_events = EXCLUDED.year_2025_events,
      year_2026_events = EXCLUDED.year_2026_events,
      month_04_2026_events = EXCLUDED.month_04_2026_events`;
}

async function main() {
  console.log(`[fix] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  // 1) 找所有「片商名女優」名下、標題含「専属 {真女優}」嘅事件
  const bad: any = await sql`
    SELECT e.id, e.title, a.id AS bad_id, a.name_ja AS bad_name,
           substring(e.title FROM '専属\\s+([^\\s]+)') AS talent
    FROM events e
    JOIN actresses a ON a.id = e.actress_id
    WHERE a.aliases && ${STUDIO_LABELS}::text[]
       OR a.name_cn = ANY(${STUDIO_LABELS})
    ORDER BY e.id`;
  console.log(`[fix] 可疑事件：${bad.length}`);

  const touched = new Set<string>();
  const relinkPlan: Array<{ eventId: string; from: string; to: string; name: string }> = [];

  for (const e of bad) {
    // 由「専属 {name}」之後到地名/活動類型之前取真女優名
    const m = e.title.match(/専属\s+(.+?)\s+(?:熊本|大阪|兵庫|横浜|秋葉原|北海道|宮城|福島|東京|新宿|渋谷|池袋|名古屋|福岡|京都|神奈川|千葉|埼玉|埼玉|Happy|撮影会|サイン会|イベント|撮影|ファン)/);
    const talent = (m ? m[1] : '').trim();
    if (!talent) { console.log(`  ! ${e.id} 拆唔到女優名，跳過`); continue; }
    const r: any = await sql`
      SELECT id, name_ja FROM actresses
      WHERE id ~ '^[0-9]+$' AND length(id)<=10 AND name_ja = ${talent} LIMIT 1`;
    if (!r[0]) { console.log(`  ! ${e.id} 女優 ${talent} 庫中無，跳過`); continue; }
    relinkPlan.push({ eventId: e.id, from: e.bad_id, to: r[0].id, name: r[0].name_ja });
    touched.add(r[0].id); touched.add(e.bad_id);
    console.log(`  ${e.id}: ${e.bad_id}(${e.bad_name}) → ${r[0].id}(${r[0].name_ja})`);
  }

  // 2) 受片商名污染嘅女優（含暫時 0 場嘅計時炸彈）
  const tainted: any = await sql`
    SELECT id, name_ja, name_cn, aliases FROM actresses
    WHERE id ~ '^[0-9]+$' AND length(id)<=10
      AND (aliases && ${STUDIO_LABELS}::text[] OR name_cn = ANY(${STUDIO_LABELS}))`;
  console.log(`[fix] 受污染女優記錄：${tainted.length}`);

  if (APPLY) {
    for (const p of relinkPlan) {
      await sql`UPDATE events SET actress_id=${p.to} WHERE id=${p.eventId} AND actress_id=${p.from}`;
    }
    // 片商名固定常數（非外用戶輸入），安全內嵌成 text[] literal
    const labelsLit = 'ARRAY[' + STUDIO_LABELS.map((l) => `'${l.replace(/'/g, "''")}'`).join(',') + ']::text[]';
    for (const a of tainted) {
      if (!/^[0-9]{1,10}$/.test(a.id)) continue;
      const pureLabel = STUDIO_LABELS.includes(a.name_cn || '');
      // name_cn 若純粹係片商名（605347 name_cn='プレステージ'）→ NULL；其餘保留譯名。
      // aliases 用 SQL 濾走片商 token；search 欄由保留欄位即場重建（trigger 唔會覆蓋顯式值）。
      const setCn = pureLabel ? 'name_cn = NULL,' : '';
      const cnInSearch = pureLabel ? 'NULL' : 'name_cn';
      const q = `
        WITH clean AS (
          SELECT id, array_agg(x) FILTER (WHERE NOT (x = ANY(${labelsLit}))) AS keep_aliases
          FROM actresses, unnest(COALESCE(aliases, ARRAY[]::text[])) x
          WHERE id = '${a.id}' GROUP BY id
        )
        UPDATE actresses aa SET
          ${setCn}
          aliases = COALESCE(c.keep_aliases, ARRAY[]::text[]),
          search_text = lower(concat_ws(' ', aa.name_ja, aa.name_kana, aa.name_romaji, ${cnInSearch},
                            array_to_string(COALESCE(c.keep_aliases, ARRAY[]::text[]), ' '))),
          search_norm = lower(concat_ws(' ', aa.name_ja, aa.name_kana, aa.name_romaji, ${cnInSearch},
                            array_to_string(COALESCE(c.keep_aliases, ARRAY[]::text[]), ' ')))
        FROM clean c WHERE aa.id = c.id`;
      await (sql as any).query(q);
      console.log(`  清洗 ${a.id} ${a.name_ja}：name_cn=${pureLabel ? 'NULL' : '保留'}，抽走片商別名`);
    }
    await rebuildCounts([...touched]);
    console.log(`[fix] 完成：改掛 ${relinkPlan.length} 場，清洗 ${tainted.length} 個女優，重建 ${touched.size} 個 count`);
  } else {
    console.log(`[fix] DRY-RUN：會改掛 ${relinkPlan.length} 場、清洗 ${tainted.length} 個女優。加 --apply 執行`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
