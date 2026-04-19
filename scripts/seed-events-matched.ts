import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

interface Actress {
  id: string;
  name_ja: string;
  name_cn: string | null;
}

interface Event {
  id: string;
  actress_name: string;
  event_name: string;
  event_date: string;
  event_type: string;
  location: string;
  url: string;
}

async function seed() {
  // Load events
  const events: Event[] = JSON.parse(fs.readFileSync('scraped-events-all.json', 'utf8'));
  console.log('Total events:', events.length);

  // Build actress name lookup from DB
  console.log('Loading actresses from DB...');
  const actresses = await sql<Actress[]>`SELECT id, name_ja, name_cn FROM actresses`;
  console.log('Actresses in DB:', actresses.length);

  const nameToId = new Map<string, string>();
  actresses.forEach(a => {
    if (a.name_ja) nameToId.set(a.name_ja.toLowerCase(), a.id);
    if (a.name_cn) nameToId.set(a.name_cn.toLowerCase(), a.id);
  });

  let matched = 0;
  let failed = 0;
  const unmatched: string[] = [];

  for (const event of events) {
    const actressName = event.actress_name || '';
    const normalized = actressName.toLowerCase().trim();
    
    let matchedId = nameToId.get(normalized);
    
    // Fuzzy match
    if (!matchedId) {
      for (const [name, id] of nameToId.entries()) {
        if (normalized.includes(name) || name.includes(normalized)) {
          matchedId = id;
          break;
        }
      }
    }

    if (matchedId) {
      try {
        await sql`
          INSERT INTO events (id, actress_id, title, venue, datetime, event_type, url, created_at)
          VALUES (${event.id}, ${matchedId}, ${event.event_name}, ${event.location}, ${event.event_date}, ${event.event_type}, ${event.url}, NOW())
          ON CONFLICT (id) DO UPDATE SET actress_id = EXCLUDED.actress_id, title = EXCLUDED.title
        `;
        matched++;
      } catch (e: any) {
        failed++;
        console.error('Error:', event.id, actressName, '-', e.message);
      }
    } else {
      failed++;
      if (!unmatched.includes(actressName)) {
        unmatched.push(actressName);
      }
    }
    
    process.stdout.write('.');
  }

  console.log('\n\n=== RESULT ===');
  console.log('Matched:', matched);
  console.log('Failed:', failed);
  if (unmatched.length > 0) {
    console.log('\nUnmatched:', unmatched);
  }
}

seed().catch(console.error);
