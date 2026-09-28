// Add events.organizer + backfill from title【...】
// Idempotent: safe to re-run.
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const pool = new Pool({ connectionString });

async function main() {
  // 1) add column if missing
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='events'`
  );
  const names = cols.rows.map((r) => r.column_name);
  if (!names.includes('organizer')) {
    await pool.query(`ALTER TABLE events ADD COLUMN organizer TEXT`);
    console.log('✓ added events.organizer');
  } else {
    console.log('✓ events.organizer already exists');
  }

  // 2) backfill organizer from leading【...】only where organizer is null/empty
  // substring(title from '【([^】]+)】') gives text between first brackets
  const upd = await pool.query(`
    UPDATE events
       SET organizer = substring(title FROM '【([^】]+)】')
     WHERE (organizer IS NULL OR organizer='')
       AND title LIKE '【%】%'
       AND id LIKE 'tw-oct-%'
  `);
  console.log(`✓ backfilled organizer for ${upd.rowCount} october events`);

  // 3) split "12the 高雄場": it is organizer+city squashed.
  //    Normalize: organizer='12the', title cleaned, prefecture 高雄 already set
  const fix = await pool.query(`
    UPDATE events
       SET organizer='12the',
           title = REPLACE(title, '【12the 高雄場】', '【12the】')
     WHERE organizer='12the 高雄場'
  `);
  console.log(`✓ normalized 12the/高雄 for ${fix.rowCount} events`);

  // verify
  const res = await pool.query(`
    SELECT organizer, COUNT(*) n FROM events
    WHERE id LIKE 'tw-oct-%'
    GROUP BY organizer ORDER BY n DESC, organizer`);
  console.log('\nOctober events by organizer:');
  res.rows.forEach((r) => console.log(`  ${r.organizer}: ${r.n}`));

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
