import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

interface Actress {
  id: string;
  name_ja: string;
}

// Improved extraction - handle more patterns
function extractActressName(title: string): string | null {
  if (!title) return null;
  
  // Pattern 1: "★Name★" or "★Name☆"
  let match = title.match(/★{1,2}([^★☆]+)[★☆]/);
  if (match) return match[1].trim();
  
  // Pattern 2: "Nameさん" or "Nameちゃん" at START
  match = title.match(/^([^\s　#【（(]+?)[さんちゃん嬢様](\s|$|[#【（(])/);
  if (match && match[1].length >= 2) return match[1];
  
  // Pattern 3: After date pattern at start - "4月29日（水）Name イベント"
  match = title.match(/[日|月|火|水|木|金|土|祝][）)]）（(]([^\s　#【（(]+?)[さんちゃん嬢様]|[日|月|火|水|木|金|土|祝][）)]）（(]([^\s　#【（(]+?)[\s　]/);
  if (match) {
    const name = match[2] || match[3];
    if (name && name.length >= 2) return name;
  }
  
  // Pattern 4: "Name in 店名" or "Name @ 店名" or "Name in店名"
  match = title.match(/^([^\s　#【（(（]+?)[\s　]*[i@][n@][\s　]|^([^\s　#【（(（]+?)[\s　]+[vv店日在中店]|[\s　#【（(（]([^\s　#【（(（]+?)[sv店在中店][\s　#【（(（])/);
  // Simpler: actress name before "in" or "店" or "様"
  match = title.match(/([^\s　#【（(（]+?)[\s　]*[i@][n@][\s　]/i);
  if (match && match[1] && match[1].length >= 2) return match[1];
  
  // Pattern 5: "【Brand】Name イベント" 
  match = title.match(/】([^\s　#【（(（]+?)[さんちゃん嬢様]?\s/);
  if (match && match[1].length >= 2) return match[1];
  
  // Pattern 6: After "●" or "○" bullet
  match = title.match(/[●○]([^\s　#【（(（]+?)[さんちゃん嬢様]?[\s　#【（(（]/);
  if (match && match[1].length >= 2) return match[1];
  
  // Pattern 7: Look for patterns like "Name ちゃん" anywhere (for events with brand prefix)
  match = title.match(/([^\s　#【（(（]+?)[さんちゃん嬢様][\s　#【（(（]/);
  if (match && match[1].length >= 2 && match[1].length <= 8) return match[1];
  
  return null;
}

async function fixEvents() {
  const actresses = await sql<Actress[]>`SELECT id, name_ja FROM actresses`;
  const nameToId = new Map<string, { id: string; name: string }>();
  actresses.forEach(a => {
    if (a.name_ja) nameToId.set(a.name_ja.toLowerCase(), { id: a.id, name: a.name_ja });
  });
  
  const events = await sql`
    SELECT id, title, actress_id FROM events 
    WHERE actress_id = 'unknown' OR actress_id IS NULL
  `;
  
  console.log(`Processing ${events.length} events...\n`);
  
  let matched = 0;
  let failed = 0;
  const failedTitles: string[] = [];
  
  for (const event of events) {
    const extractedName = extractActressName(event.title);
    
    if (!extractedName) {
      failed++;
      if (failedTitles.length < 10) failedTitles.push(event.title);
      continue;
    }
    
    const normalized = extractedName.toLowerCase();
    const found = nameToId.get(normalized);
    
    if (found) {
      await sql`UPDATE events SET actress_id = ${found.id} WHERE id = ${event.id}`;
      matched++;
      process.stdout.write('.');
    } else {
      failed++;
      if (failedTitles.length < 10) failedTitles.push(`${extractedName} <- ${event.title}`);
    }
  }
  
  console.log(`\n\n=== RESULT ===`);
  console.log(`Matched: ${matched}`);
  console.log(`Failed: ${failed}`);
  if (failedTitles.length > 0) {
    console.log('\nSample failed titles:');
    failedTitles.slice(0, 5).forEach(t => console.log('-', t));
  }
}

fixEvents().catch(console.error);
