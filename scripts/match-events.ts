import sql from '../lib/db';
import * as fs from 'fs';

interface Actress {
  id: string;
  name_ja: string;
  name_cn: string | null;
}

interface Event {
  id: string;
  actress_id: string;  // Currently name, need to match
  actress_name: string;
  event_name: string;
  event_date: string;
  event_type: string;
  location: string;
  description: string;
  url: string;
}

async function matchEvents() {
  // Load events
  const events: Event[] = JSON.parse(fs.readFileSync('scraped-events-all.json', 'utf8'));
  console.log('Total events to match:', events.length);

  // Load all actresses from DB to build name->id map
  const actresses = await sql<Actress[]>`SELECT id, name_ja, name_cn FROM actresses`;
  console.log('Total actresses in DB:', actresses.length);

  // Build name lookup map (lowercase for fuzzy matching)
  const nameToId = new Map<string, string>();
  actresses.forEach(a => {
    if (a.name_ja) nameToId.set(a.name_ja.toLowerCase(), a.id);
    if (a.name_cn) nameToId.set(a.name_cn.toLowerCase(), a.id);
  });

  // Match each event
  let matched = 0;
  let unmatched = 0;
  const unmatchedList: string[] = [];

  for (const event of events) {
    // Try to match by actress name
    const actressName = event.actress_name || event.actress_id;
    const normalizedName = actressName.toLowerCase();
    
    let matchedId = nameToId.get(normalizedName);
    
    if (!matchedId) {
      // Try partial match
      for (const [name, id] of nameToId.entries()) {
        if (normalizedName.includes(name) || name.includes(normalizedName)) {
          matchedId = id;
          break;
        }
      }
    }

    if (matchedId) {
      // Update event with correct actress_id
      try {
        await sql`
          UPDATE events 
          SET actress_id = ${matchedId}
          WHERE id = ${event.id}
        `;
        matched++;
      } catch (e: any) {
        console.error('Update failed for event', event.id, e.message);
        unmatched++;
        unmatchedList.push(`${event.id}: ${actressName}`);
      }
    } else {
      unmatched++;
      if (!unmatchedList.includes(actressName)) {
        unmatchedList.push(actressName);
      }
    }

    if ((matched + unmatched) % 10 === 0) {
      console.log(`Progress: ${matched} matched, ${unmatched} unmatched`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Matched:', matched);
  console.log('Unmatched:', unmatched);
  if (unmatchedList.length > 0) {
    console.log('\nUnmatched actress names:');
    unmatchedList.slice(0, 20).forEach(n => console.log(' -', n));
  }
}

matchEvents().catch(console.error);
