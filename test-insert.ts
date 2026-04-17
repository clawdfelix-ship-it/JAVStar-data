import sql from './lib/db';
(async () => {
  await sql`INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at)
             VALUES ('test123', 'test', 'Test Event', '2025-01-01', 'Tokyo', 'Test Venue', 'release', 'http://test.com', NOW())
             ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`;
  const total = await sql`SELECT COUNT(*) as cnt FROM events`;
  console.log('After test insert, total:', total);
})().catch(e => { console.error(e.message); process.exit(1); });
