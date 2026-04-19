import sql from '../lib/db';
import * as fs from 'fs';

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
  description: string;
  url: string;
}

async function matchAndSeed() {
  // Load events from scraped file
  const events: Event[] = JSON.parse(fs.readFileSync('scraped-events-all.json', 'utf8'));
  console.log('Total events to process:', events.length);

  // Load all actresses from DB to build name->id map
  const actresses = await sql<Actress[]>`SELECT id, name_ja, name_cn FROM actresses`;
  console.log('Total actresses in DB:', actresses.length);

  // Build name lookup map (lowercase for case-insensitive matching)
  const nameToId = new Map<string, string>();
  actresses.forEach(a => {
    if (a.name_ja) nameToId.set(a.name_ja.toLowerCase(), a.id);
    if (a.name_cn) nameToId.set(a.name_cn.toLowerCase(), a.id);
  });

  console.log('\nMatching events to actresses...');
  
  let matched = 0;
  let insertFailed = 0;
  const unmatchedNames: string[] = [];

  for (const event of events) {
    const actressName = event.actress_name;
    const normalizedName = actressName.toLowerCase();
    
    let matchedId = nameToId.get(normalizedName);
    
    // Try fuzzy match if exact match fails
    if (!matchedId) {
      for (const [name, id] of nameToId.entries()) {
        if (normalizedName.includes(name) || name.includes(normalizedName)) {
          matchedId = id;
          break;
        }
      }
    }

    if (matchedId) {
      // Insert event with correct actress_id
      try {
        await sql`
          INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type, url, created_at)
          VALUES (
            ${event.id},
            ${matchedId},
            ${event.event_name || ''},
            ${event.location || ''},
            ${''},  <!-- prefecture - extract if possible -->
            ${event.event_date},
            ${event.event_type || 'other'},
            ${event.url || ''},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            actress_id = EXCLUDED.actress_id,
            title = EXCLUDED.title,
            venue = EXCLUDED.venue,
            datetime = EXCLUDED.datetime,
            event_type = EXCLUDED.event_type
        `;
        matched++;
      } catch (e: any) {
        insertFailed++;
        if (unmatchedNames.length < 20) {
          console.error('Insert failed:', event.id, actressName, e.message);
        }
      }
    } else {
      insertFailed++;
      if (!unmatchedNames.includes(actressName)) {
        unmatchedNames.push(actressName);
      }
    }

    process.stdout.write('.');
  }

  console.log('\n\n=== SUMMARY ===');
  console.log('Matched & inserted:', matched);
  console.log('Failed:', insertFailed);
  
  if (unmatchedNames.length > 0) {
    console.log('\nUnmatched actress names (not in DB):');
    unmatchedNames.forEach(n => console.log(' -', n));
  }
}

matchAndSeed().catch(console.error);
