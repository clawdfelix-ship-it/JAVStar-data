import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // upcoming week in JST: Mon 2026-09-07 00:00 -> Sun 2026-09-13 23:59 JST
  // JST = UTC+9
  const start = '2026-09-06T15:00:00Z'; // 09-07 00:00 JST
  const end   = '2026-09-13T14:59:59Z'; // 09-13 23:59 JST

  // inspect columns first
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='events' ORDER BY ordinal_position`;
  console.log('EVENTS COLS:', JSON.stringify(cols));

  const events = await sql`
    SELECT e.id, e.title, e.venue, e.prefecture, e.datetime, e.event_type,
           a.name_ja, a.name_cn
    FROM events e
    LEFT JOIN actresses a ON a.id = e.actress_id
    WHERE e.datetime >= ${start} AND e.datetime <= ${end}
    ORDER BY e.datetime ASC
    LIMIT 30`;
  console.log('EVENTS COUNT:', events.length);
  console.log(JSON.stringify(events, null, 2));

  // votes top 3 in past 7 days
  const votes = await sql`
    SELECT v.actress_id, a.name_ja, a.name_cn, COUNT(*)::int AS n
    FROM votes v
    LEFT JOIN actresses a ON a.id = v.actress_id
    WHERE v.voted_at >= NOW() - INTERVAL '7 days'
    GROUP BY v.actress_id, a.name_ja, a.name_cn
    ORDER BY n DESC
    LIMIT 5`;
  console.log('VOTES TOP:', JSON.stringify(votes, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
