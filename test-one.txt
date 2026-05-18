import sql from './lib/db';
import allEvents from './scraped-events-search.json';

(async () => {
  const e = allEvents[0];
  console.log('Inserting event 0:', e.href?.split('/').pop(), e.text);
  try {
    await sql`INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at)
               VALUES (${e.href?.split('/').pop() || 'unknown'}, 'unknown', ${e.text || ''}, ${e.date || ''}, '', '', '', ${e.href || ''}, NOW())
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, actress_id = 'unknown'`;
    console.log('Insert successful');
  } catch (err) {
    console.error('Insert failed:', (err as Error).message);
  }
  const total = await sql`SELECT COUNT(*) as cnt FROM events`;
  console.log('Total:', total);
})().catch(e => { console.error(e.message); process.exit(1); });
