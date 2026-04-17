import sql from './lib/db';
(async () => {
  const total = await sql`SELECT COUNT(*) as cnt FROM events`;
  console.log('Total events in DB:', total);
})().catch(e => { console.error(e.message); process.exit(1); });
