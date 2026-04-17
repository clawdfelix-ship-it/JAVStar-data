import sql from './lib/db';
import allEvents from './scraped-events-search.json';

async function seedBatch(start, end) {
  let success = 0;
  for (let i = start; i < end && i < allEvents.length; i++) {
    const e = allEvents[i];
    try {
      await sql`INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at)
                 VALUES (${e.href?.split('/').pop() || 'unknown'}, 'unknown', ${e.text || ''}, ${e.date || ''}, '', '', '', ${e.href || ''}, NOW())
                 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, actress_id = 'unknown'`;
      success++;
    } catch (err) {
      // ignore duplicates silently
    }
  }
  console.log('Batch ' + start + '-' + end + ': ' + success + ' success');
}

await seedBatch(0, 200);
await seedBatch(200, 400);
await seedBatch(400, 600);
await seedBatch(600, 800);
await seedBatch(800, 1000);
console.log('Batches 1-5 done');
