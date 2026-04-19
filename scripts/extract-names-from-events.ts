import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

interface Actress {
  id: string;
  name_ja: string;
}

// Extract actress name from event title
// Common patterns: "演员名 活动", "演员名　活动", "★演员名★活动"
function extractActressName(title: string): string | null {
  if (!title) return null;
  
  // Pattern: "★Name★" or "★Name☆"
  let match = title.match(/★{1,2}([^★☆]+)[★☆]/);
  if (match) return match[1].trim();
  
  // Pattern: "Name 活动类型" - usually actress name at start
  // e.g. "小野六花　チェキ撮影会" or "小野六花 チェキ撮影会"
  match = title.match(/^([^\s　]+)[\s　]+[ぁ-んァ-ンa-zA-Z]/);
  if (match && match[1].length >= 2 && match[1].length <= 10) {
    return match[1];
  }
  
  // Pattern: "日期 Name 活动" 
  match = title.match(/[日|月|火|水|木|金|土|祝][\s　]([^\s　（|(]+)[\s　（|(]/);
  if (match) return match[1];
  
  // Pattern: "活动名 [in|@|at] 店名" - actress name before common suffixes
  match = title.match(/^([^\s　#【]+?(?:さん|ちゃん|嬢|様))/);
  if (match) {
    const name = match[1].replace(/[さんちゃん嬢様]$/, '');
    if (name.length >= 2) return name;
  }
  
  return null;
}

async function fixEvents() {
  // Get all actresses for matching
  const actresses = await sql<Actress[]>`SELECT id, name_ja FROM actresses`;
  const nameToId = new Map<string, { id: string; name: string }>();
  
  actresses.forEach(a => {
    if (a.name_ja) {
      nameToId.set(a.name_ja.toLowerCase(), { id: a.id, name: a.name_ja });
    }
  });
  
  // Also build partial match map (first 2 chars)
  const partialMap = new Map<string, { id: string; name: string }[]>();
  actresses.forEach(a => {
    if (a.name_ja && a.name_ja.length >= 2) {
      const key = a.name_ja.slice(0, 2);
      if (!partialMap.has(key)) partialMap.set(key, []);
      partialMap.get(key)!.push({ id: a.id, name: a.name_ja });
    }
  });

  // Get events with unknown actress_id
  const events = await sql`
    SELECT id, title, actress_id FROM events 
    WHERE actress_id = 'unknown' OR actress_id IS NULL
  `;
  
  console.log(`Found ${events.length} events with unknown actress_id\n`);
  
  let matched = 0;
  let failed = 0;
  
  for (const event of events) {
    const extractedName = extractActressName(event.title);
    
    if (!extractedName) {
      failed++;
      if (failed <= 5) console.log(`Cannot extract name from: "${event.title}"`);
      continue;
    }
    
    const normalized = extractedName.toLowerCase();
    let found = nameToId.get(normalized);
    
    // Try partial match
    if (!found && normalized.length >= 2) {
      const key = normalized.slice(0, 2);
      const candidates = partialMap.get(key);
      if (candidates && candidates.length === 1) {
        found = candidates[0];
      } else if (candidates && candidates.length > 1) {
        // Try to find best match
        for (const c of candidates) {
          if (c.name.toLowerCase().includes(normalized) || normalized.includes(c.name.toLowerCase())) {
            found = c;
            break;
          }
        }
      }
    }
    
    if (found) {
      await sql`UPDATE events SET actress_id = ${found.id} WHERE id = ${event.id}`;
      matched++;
      process.stdout.write('.');
    } else {
      failed++;
      if (failed <= 3) console.log(`\nNo match: "${extractedName}" from "${event.title}"`);
    }
  }
  
  console.log(`\n\n=== RESULT ===`);
  console.log(`Matched: ${matched}`);
  console.log(`Failed: ${failed}`);
}

fixEvents().catch(console.error);
