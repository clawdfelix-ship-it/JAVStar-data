import sql from './lib/db';
import allEvents from './scraped-events-search.json';

function extractEventId(href: string | undefined): string {
  if (!href) return 'unknown';
  const parts = href.split('/');
  const id = parts.slice(-2, -1)[0];
  return id || 'unknown';
}

async function seedBatch(start: number, end: number) {
  let success = 0;
  for (let i = start; i < end && i < allEvents.length; i++) {
    const e = allEvents[i];
    const id = extractEventId(e.href);
    try {
      await sql`INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at)
                 VALUES (${id}, 'unknown', ${e.text || ''}, ${e.date || ''}, '', '', '', ${e.href || ''}, NOW())
                 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, actress_id = 'unknown'`;
      success++;
    } catch (err: any) {
      // silent duplicate or other
    }
  }
  console.log(`Batch ${start}-${end}: ${success} success`);
  return success;
}

async function main() {
  // Resume from 1200
  for (let start = 1200; start < 2000; start += 100) {
    await seedBatch(start, start + 100);
  }
  console.log('All batches complete!');
}

main().catch(e => { console.error(e.message); process.exit(1); });
