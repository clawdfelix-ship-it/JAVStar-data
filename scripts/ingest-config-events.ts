/**
 * 通用 config 驅動活動匯入（手工/外部報名表來源，非 scraper）
 *
 * config 格式：{ events:[{id, actress_ja, date, kind, title, venue, url}] }
 * 用法：
 *   npx tsx scripts/ingest-config-events.ts <config.json> <prefecture> [--apply]
 *   prefecture 例：香港 / 台北（geo trigger 識「台北」做台灣分頁）
 *
 * 女優用日文原名 exact match（numeric id）；date_iso 直給，多日場用首日。
 * 預設 dry-run。
 */
try { process.loadEnvFile(); } catch {}

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

const sql = neon(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');
const file = process.argv[2];
const prefecture = process.argv[3];
if (!file || !prefecture) {
  console.error('用法: tsx ingest-config-events.ts <config.json> <prefecture> [--apply]');
  process.exit(1);
}

interface CfgEvent {
  id: string;
  actress_ja: string;
  date: string;
  kind: string;
  title: string;
  venue: string;
  url: string;
}
const cfg = JSON.parse(fs.readFileSync(file, 'utf8')) as { events: CfgEvent[] };

async function main() {
  console.log(`[cfg-events] ${APPLY ? 'APPLY' : 'DRY-RUN'}｜${cfg.events.length} 場｜prefecture=${prefecture}｜${file}`);
  const touched = new Set<string>();
  for (const ev of cfg.events) {
    const rows: any = await sql`
      SELECT id, name_ja FROM actresses
      WHERE id ~ '^[0-9]+$' AND length(id)<=10 AND name_ja = ${ev.actress_ja} LIMIT 1`;
    if (!rows[0]) { console.log(`  ✗ ${ev.id} 搵唔到女優 ${ev.actress_ja}，跳過`); continue; }
    const aid = rows[0].id as string;
    touched.add(aid);
    console.log(`  ${ev.id} ${ev.date} → ${aid} ${rows[0].name_ja}｜${ev.title}`);
    if (APPLY) {
      await sql`
        INSERT INTO events (id, actress_id, title, datetime, date_iso, venue, prefecture, event_type, url, created_at)
        VALUES (${ev.id}, ${aid}, ${ev.title}, ${ev.date}, ${ev.date}::date,
                ${ev.venue}, ${prefecture},
                ${['photo','meet','dvd','offkai'].includes(ev.kind) ? ev.kind : 'other'},
                ${ev.url}, NOW()::text)
        ON CONFLICT (id) DO UPDATE SET
          actress_id = EXCLUDED.actress_id, title = EXCLUDED.title, datetime = EXCLUDED.datetime,
          date_iso = EXCLUDED.date_iso, venue = EXCLUDED.venue, prefecture = EXCLUDED.prefecture,
          event_type = EXCLUDED.event_type, url = EXCLUDED.url`;
    }
  }
  if (APPLY && touched.size) {
    await sql`
      INSERT INTO actress_events_count (actress_id, year_2025_events, year_2026_events, month_04_2026_events)
      SELECT actress_id,
        COUNT(*) FILTER (WHERE date_iso >= '2025-01-01' AND date_iso <  '2026-01-01')::int,
        COUNT(*) FILTER (WHERE date_iso >= '2026-01-01' AND date_iso <  '2027-01-01')::int,
        COUNT(*) FILTER (WHERE date_iso >= date_trunc('month', CURRENT_DATE)::date
                          AND date_iso <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int
      FROM events WHERE actress_id = ANY(${[...touched]})
      GROUP BY actress_id
      ON CONFLICT (actress_id) DO UPDATE SET
        year_2025_events=EXCLUDED.year_2025_events,
        year_2026_events=EXCLUDED.year_2026_events,
        month_04_2026_events=EXCLUDED.month_04_2026_events`;
    console.log(`[cfg-events] 完成，重建 ${touched.size} 個女優 count`);
  } else if (!APPLY) {
    console.log('[cfg-events] DRY-RUN，加 --apply 執行');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
