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

async function retry() {
  const events: Event[] = JSON.parse(fs.readFileSync('scraped-events-all.json', 'utf8'));
  
  // Get all actresses
  const actresses = await sql<Actress[]>`SELECT id, name_ja, name_cn FROM actresses`;
  const nameToId = new Map<string, string>();
  actresses.forEach(a => {
    if (a.name_ja) nameToId.set(a.name_ja.toLowerCase(), a.id);
    if (a.name_cn) nameToId.set(a.name_cn.toLowerCase(), a.id);
  });

  // Unmatched names to retry
  const unmatched = ['天宮みすず', 'ツナマヨ', '九野ひなの', '久和原せいら', '和栗ゆゆ', '七瀬アリス', '浅倉みのり'];
  
  console.log('=== Retry matching for unmatched ===\n');
  
  for (const name of unmatched) {
    const normalized = name.toLowerCase().trim();
    
    // Try different fuzzy matching strategies
    let found = null;
    
    // Strategy 1: Remove spaces and retry
    const noSpace = normalized.replace(/\s+/g, '');
    for (const [dbName, id] of nameToId.entries()) {
      const dbNoSpace = dbName.replace(/\s+/g, '');
      if (dbNoSpace.includes(noSpace) || noSpace.includes(dbNoSpace)) {
        found = { name: dbName, id };
        break;
      }
    }
    
    // Strategy 2: Try katakana/hiragana conversion
    if (!found) {
      // Check partial match with first 2 chars
      const first2 = normalized.slice(0, 2);
      for (const [dbName, id] of nameToId.entries()) {
        if (dbName.startsWith(first2) || normalized.startsWith(dbName.slice(0, 2))) {
          found = { name: dbName, id };
          break;
        }
      }
    }
    
    if (found) {
      console.log(`MATCH: "${name}" -> "${found.name}" (${found.id})`);
      
      // Find the event and update
      const event = events.find(e => e.actress_name === name);
      if (event) {
        try {
          await sql`
            INSERT INTO events (id, actress_id, title, venue, datetime, event_type, url, created_at)
            VALUES (${event.id}, ${found.id}, ${event.event_name}, ${event.location}, ${event.event_date}, ${event.event_type}, ${event.url}, NOW())
            ON CONFLICT (id) DO UPDATE SET actress_id = EXCLUDED.actress_id
          `;
          console.log(`  → Updated event ${event.id}`);
        } catch (e: any) {
          console.error(`  → Error: ${e.message}`);
        }
      }
    } else {
      console.log(`NO MATCH: "${name}"`);
      // Try to find similar in DB
      const similar = actresses.filter(a => 
        a.name_ja && (a.name_ja.includes(name.slice(0, 2)) || name.includes(a.name_ja.slice(0, 2)))
      ).slice(0, 3);
      if (similar.length > 0) {
        console.log('  Similar:', similar.map(a => a.name_ja).join(', '));
      }
    }
  }
}

retry().catch(console.error);
