import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

interface Actress {
  id: string;
  name_ja: string;
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
  
  console.log(`Processing ${events.length} events...`);
  
  let matched = 0;
  let failed = 0;
  
  for (const event of events) {
    const title = event.title || '';
    
    // Try various extraction patterns
    let name = null;
    
    // Pattern 1: ★Name★
    let m = title.match(/★([^★☆]+)★/);
    if (m) name = m[1].trim();
    
    // Pattern 2: ActressName ちゃん/さん at start
    if (!name) {
      m = title.match(/^([^\s　#【（(（]+?)[さんちゃん嬢様]/);
      if (m && m[1].length >= 2) name = m[1];
    }
    
    // Pattern 3: After 】 
    if (!name) {
      m = title.match(/】([^\s　#【（(（]+?)[\s　#【（(（]/);
      if (m && m[1].length >= 2) name = m[1];
    }
    
    // Pattern 4: "Name in" pattern
    if (!name) {
      m = title.match(/^([^\s　#【（(（]+?)[\s　]+[iI][nN][\s　]/);
      if (m && m[1].length >= 2) name = m[1];
    }
    
    if (name) {
      const normalized = name.toLowerCase();
      const found = nameToId.get(normalized);
      
      if (found) {
        await sql`UPDATE events SET actress_id = ${found.id} WHERE id = ${event.id}`;
        matched++;
        process.stdout.write('.');
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }
  
  console.log(`\n\n=== RESULT ===`);
  console.log(`Matched: ${matched}`);
  console.log(`Failed: ${failed}`);
}

fixEvents().catch(console.error);
