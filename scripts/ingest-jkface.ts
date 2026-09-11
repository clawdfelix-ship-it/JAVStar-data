/**
 * jkface 台灣活動入庫（2026-09-11）
 *
 * 輸入：scrape-jkface-camoufox.py 產出 JSON
 *   {events:[{id,title,start_date,end_date,venue,url,cast:[繁中名...],tags}]}
 *
 * 規則：
 * - id 前綴 jkf- 防撞 av-event 數字 id；每個 cast 一列（jkf-{id}、jkf-{id}-2…），
 *   冇 cast 都入一列（actress_id=NULL，公開 API 暫唔顯示，等人補別名/女優）。
 * - cast 繁中名 → config/jkface-aliases.json 日文原名 → actresses 表 exact match
 *   （id 數字、≤10位）；另試 search_norm trigram 兜底。配唔到 log 列出。
 * - date_iso 直接俾 start_date（多日場用首日，同 Felix 2026-09-11 共識）。
 * - venue 空但標題含台灣 → 「台灣（場地待公布）」，等 geo trigger 派台北。
 *
 * 用法：npx tsx scripts/ingest-jkface.ts <json> [--apply]
 * 預設 dry-run，只報會做咩。
 */
try { process.loadEnvFile(); } catch {}

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');
const file = process.argv[2];
if (!file) {
  console.error('用法: tsx ingest-jkface.ts <scrape.json> [--apply]');
  process.exit(1);
}

interface ScrapeEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  venue: string;
  url: string;
  cast: string[];
  tags: string[];
}

const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as { events: ScrapeEvent[] };
const aliases = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'jkface-aliases.json'), 'utf8'),
) as { aliases: Record<string, string> };

async function matchActress(cnName: string): Promise<{ id: string; nameJa: string } | null> {
  const jaName = aliases.aliases[cnName];
  // 1) curated 日文原名 exact
  if (jaName) {
    const rows: any = await sql`
      SELECT id, name_ja FROM actresses
      WHERE id ~ '^[0-9]+$' AND length(id) <= 10 AND name_ja = ${jaName}
      LIMIT 1`;
    if (rows[0]) return { id: rows[0].id as string, nameJa: rows[0].name_ja as string };
  }
  // 2) 繁中名 direct（名本身可能就係日文漢字，e.g. 桜野桃）
  const direct: any = await sql`
    SELECT id, name_ja FROM actresses
    WHERE id ~ '^[0-9]+$' AND length(id) <= 10
      AND (name_ja = ${cnName} OR name_cn = ${cnName})
    LIMIT 1`;
  if (direct[0]) return { id: direct[0].id, nameJa: direct[0].name_ja };
  // 3) trigram 兜底（search_norm，異體字正規化）；門檻收緊到 0.6 防誤配
  const tri: any = await sql`
    SELECT id, name_ja,
      greatest(similarity(coalesce(search_norm,''), ${cnName}),
               similarity(coalesce(search_text,''), ${cnName})) AS s
    FROM actresses
    WHERE id ~ '^[0-9]+$' AND length(id) <= 10
      AND (search_norm % ${cnName} OR search_text % ${cnName})
    ORDER BY s DESC LIMIT 1`;
  if (tri[0] && Number(tri[0].s) >= 0.6) return { id: tri[0].id, nameJa: tri[0].name_ja };
  return null;
}

async function rebuildCounts(actressIds: string[]) {
  if (!actressIds.length) return;
  await sql`
    INSERT INTO actress_events_count (actress_id, year_2025_events, year_2026_events, month_04_2026_events)
    SELECT actress_id,
      COUNT(*) FILTER (WHERE date_iso >= '2025-01-01' AND date_iso <  '2026-01-01')::int,
      COUNT(*) FILTER (WHERE date_iso >= '2026-01-01' AND date_iso <  '2027-01-01')::int,
      COUNT(*) FILTER (WHERE date_iso >= date_trunc('month', CURRENT_DATE)::date
                        AND date_iso <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int
    FROM events
    WHERE actress_id = ANY(${actressIds})
    GROUP BY actress_id
    ON CONFLICT (actress_id) DO UPDATE SET
      year_2025_events = EXCLUDED.year_2025_events,
      year_2026_events = EXCLUDED.year_2026_events,
      month_04_2026_events = EXCLUDED.month_04_2026_events`;
}

async function main() {
  console.log(`[jkf] ${APPLY ? 'APPLY' : 'DRY-RUN'}｜讀入 ${payload.events.length} 場（${file}）`);
  const unmatched = new Map<string, string[]>(); // castName -> event ids
  const touchedActresses = new Set<string>();
  let rowsPlanned = 0;

  for (const ev of payload.events) {
    const cast = ev.cast.length ? ev.cast : [''];
    const multiDay = ev.start_date !== ev.end_date;
    const datetimeText = multiDay ? `${ev.start_date} ~ ${ev.end_date}` : ev.start_date;
    // venue 空＋台灣活動 → 兜底文字令 geo trigger 派台北
    const venue = ev.venue.trim() || '台灣（場地待公布）';

    for (let i = 0; i < cast.length; i++) {
      const cn = cast[i];
      const rowId = i === 0 ? `jkf-${ev.id}` : `jkf-${ev.id}-${i + 1}`;
      const match = cn ? await matchActress(cn) : null;
      if (cn && !match) {
        const list = unmatched.get(cn) || [];
        list.push(ev.id);
        unmatched.set(cn, list);
      }
      if (match) touchedActresses.add(match.id);
      rowsPlanned++;
      console.log(
        `  ${rowId} ${ev.start_date} ${match ? `→ ${match.id} ${match.nameJa}` : `→ 未配對（${cn || '冇 cast'}）`}\n` +
        `     ${ev.title.slice(0, 60)}\n     venue=${venue}`,
      );

      if (APPLY) {
        await sql`
          INSERT INTO events (id, actress_id, title, datetime, date_iso, venue, event_type, url, created_at)
          VALUES (
            ${rowId},
            ${match ? match.id : null},
            ${ev.title},
            ${datetimeText},
            ${ev.start_date}::date,
            ${venue},
            'meet',
            ${ev.url},
            NOW()::text
          )
          ON CONFLICT (id) DO UPDATE SET
            actress_id = EXCLUDED.actress_id,
            title      = EXCLUDED.title,
            datetime   = EXCLUDED.datetime,
            date_iso   = EXCLUDED.date_iso,
            venue      = EXCLUDED.venue,
            event_type = EXCLUDED.event_type,
            url        = EXCLUDED.url`;
      }
    }
  }

  if (APPLY) {
    await rebuildCounts([...touchedActresses]);
    console.log(`[jkf] 入庫完成：${rowsPlanned} 列；重建 ${touchedActresses.size} 個女優嘅 events_count`);
  } else {
    console.log(`[jkf] DRY-RUN：會寫 ${rowsPlanned} 列。確認無誤加 --apply`);
  }

  if (unmatched.size) {
    console.log('\n[jkf] ⚠️ 未配對女優（公開日曆暫唔會顯示呢啲列，補 config/jkface-aliases.json 或加女優後重跑）：');
    for (const [name, ids] of unmatched) {
      console.log(`  - ${name}（場次 ${ids.join(', ')}）`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
