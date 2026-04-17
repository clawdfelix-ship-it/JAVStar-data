import { neon } from '@neondatabase/serverless';
import events from './scraped-events-search.json';

const sql = neon(process.env.POSTGRES_URL_NON_POOLING!);

async function seed() {
  console.log('Seeding', events.length, 'events...');
  let success = 0;
  let errors = 0;
  const actressId = '985557';

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const id = e.href?.split('/').pop()?.replace(/\/$/, '') || 'unknown';
    try {
      await sql`INSERT INTO events (id, actress_id, title, datetime, event_type, venue, prefecture, url, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, datetime = EXCLUDED.datetime, url = EXCLUDED.url`,
        [id, actressId, e.text || '', e.date || '', '', '', '', e.href || ''];
      success++;
      if (success % 100 === 0) process.stdout.write(' ' + success);
    } catch (err: any) {
      errors++;
      if (errors <= 3) console.error('\nError:', id, err.message.split('\n')[0]);
    }
    if (i % 50 === 49) await new Promise(r => setTimeout(r, 500));
  }
  console.log('\nDone:', success, '/', events.length, '| Errors:', errors);
}

seed();