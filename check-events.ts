import sql from './lib/db';
(async () => {
  const events = await sql`SELECT id, title, actress_id FROM events LIMIT 20`;
  console.log('Sample events:', JSON.stringify(events, null, 2));
  const total = await sql`SELECT COUNT(*) as cnt FROM events`;
  console.log('Total:', total);
})().catch(e => { console.error(e.message); process.exit(1); });
