import sql from './lib/db';
(async () => {
  // Test: insert 5 rows with sequential IDs and check count
  const testIds = ['DEBUG_1','DEBUG_2','DEBUG_3','DEBUG_4','DEBUG_5'];
  for (const id of testIds) {
    try {
      const r = await sql`INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at)
        VALUES (${id}, 'unknown', ${'Test ' + id}, '2026-01-01', '', '', '', 'http://x.com', NOW())
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
        RETURNING id, title`;
      console.log('Inserted/Updated:', JSON.stringify(r));
    } catch (err) {
      console.error('Error for', id, ':', (err as Error).message);
    }
  }
  const cnt = await sql`SELECT COUNT(*) as cnt FROM events`;
  console.log('Total count after debug inserts:', cnt);
})().catch(e => { console.error(e.message); process.exit(1); });
