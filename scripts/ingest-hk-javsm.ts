/**
 * JAVSM 自家香港活動入庫（2026-09-12）
 *
 * 輸入：config/hk-javsm-events-2026.json
 * 只入 JAVSM 自家場（其他主辦撞期資料屬內部參考，唔入、唔公開）。
 * id 前綴 hkjsm-；actress 用日文原名 exact match；date_iso 直給。
 *
 * 用法：npx tsx scripts/ingest-hk-javsm.ts [--apply]
 */
try { process.loadEnvFile(); } catch {}

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');

interface HkEvent {
  id: string;
  actress_ja: string;
  date: string;
  kind: string;
  title: string;
  venue: string;
  url: string;
}

const cfg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'hk-javsm-events-2026.json'), 'utf8'),
) as { events: HkEvent[] };

async function main() {
  console.log(`[hkjsm] ${APPLY ? 'APPLY' : 'DRY-RUN'}｜${cfg.events.length} 場`);
  const touched = new Set<string>();

  for (const ev of cfg.events) {
    const rows: any = await sql`
      SELECT id, name_ja FROM actresses
      WHERE id ~ '^[0-9]+$' AND length(id) <= 10 AND name_ja = ${ev.actress_ja}
      LIMIT 1`;
    if (!rows[0]) {
      console.log(`  ✗ ${ev.id} ${ev.date} 搵唔到女優 ${ev.actress_ja}，跳過`);
      continue;
    }
    const aid = rows[0].id as string;
    touched.add(aid);
    console.log(`  ${ev.id} ${ev.date} → ${aid} ${rows[0].name_ja}｜${ev.title}`);

    if (APPLY) {
      await sql`
        INSERT INTO events (id, actress_id, title, datetime, date_iso, venue, prefecture, event_type, url, created_at)
        VALUES (${ev.id}, ${aid}, ${ev.title}, ${ev.date}, ${ev.date}::date,
                ${ev.venue}, '香港', ${ev.kind === 'photo' ? 'photo' : 'meet'},
                ${ev.url}, NOW()::text)
        ON CONFLICT (id) DO UPDATE SET
          actress_id = EXCLUDED.actress_id,
          title      = EXCLUDED.title,
          datetime   = EXCLUDED.datetime,
          date_iso   = EXCLUDED.date_iso,
          venue      = EXCLUDED.venue,
          prefecture = EXCLUDED.prefecture,
          event_type = EXCLUDED.event_type,
          url        = EXCLUDED.url`;
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
        year_2025_events = EXCLUDED.year_2025_events,
        year_2026_events = EXCLUDED.year_2026_events,
        month_04_2026_events = EXCLUDED.month_04_2026_events`;
    console.log(`[hkjsm] 完成，重建 ${touched.size} 個女優 count`);
  } else if (!APPLY) {
    console.log('[hkjsm] DRY-RUN，加 --apply 入庫');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
