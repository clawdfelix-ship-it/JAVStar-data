// 森日向子(985557) 12/5-6 香港活動：以篠原いよ(192328) 11/21-22 為模板 clone
// 攝影會＋快閃見面會＋OFF會(12/5)，見面會4時段(12/6)，時間/場地/票務一致，主辦 javstarmeet
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
process.env.DATABASE_URL = readFileSync('.env.local','utf8').match(/DATABASE_URL="([^"]+)"/)[1];
const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes('--apply');

const AID = '985557';
const NAME = '森日向子';

// [模板id, 新id, 新日期, 新標題, 頂層venue]
const plan = [
  ['javstar-192328-20261121-photo', `javstar-${AID}-20261205-photo`, '2026-12-05', `${NAME} 香港粉絲攝影會 2026/12/05`, '香港'],
  ['javstar-192328-20261121-flash', `javstar-${AID}-20261205-flash`, '2026-12-05', `${NAME} 旺角快閃攝影見面會 2026/12/05`, '旺角'],
  ['javstar-192328-20261121-off',   `javstar-${AID}-20261205-off`,   '2026-12-05', `${NAME} OFF會 2026/12/05`, '香港'],
  ['javstar-192328-20261122-meet',  `javstar-${AID}-20261206-meet`,  '2026-12-06', `${NAME} 香港粉絲見面會 2026/12/06`, '香港'],
];

for (const [tplId, newId, date, title, venue] of plan) {
  const tpl = await sql`SELECT * FROM events WHERE id=${tplId}`;
  if (!tpl.length) { console.log('✗ 模板缺失', tplId); continue; }
  const t = tpl[0];
  console.log(`${APPLY?'📤':'🔍'} ${newId} (${t.event_type}) ← ${tplId}`);
  console.log('   標題:', title);
  if (APPLY) {
    await sql`
      INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type, url, created_at, date_iso, organizer, program_json)
      VALUES (${newId}, ${AID}, ${title}, ${venue}, ${t.prefecture}, ${date}, ${t.event_type}, ${t.url||''}, now(), ${date}::date, 'javstarmeet', ${JSON.stringify(t.program_json)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        actress_id=EXCLUDED.actress_id, title=EXCLUDED.title, venue=EXCLUDED.venue,
        datetime=EXCLUDED.datetime, event_type=EXCLUDED.event_type, date_iso=EXCLUDED.date_iso,
        organizer=EXCLUDED.organizer, program_json=EXCLUDED.program_json`;
  }
}

// rebuild count
if (APPLY) {
  await sql`
    INSERT INTO actress_events_count (actress_id, year_2026_events)
    SELECT ${AID}, COUNT(*)::int FROM events WHERE actress_id=${AID} AND date_iso IS NOT NULL AND to_char(date_iso,'YYYY')='2026'
    ON CONFLICT (actress_id) DO UPDATE SET year_2026_events=EXCLUDED.year_2026_events`;
  console.log('✅ count rebuilt');
}
console.log(APPLY?'APPLIED':'DRY-RUN');
