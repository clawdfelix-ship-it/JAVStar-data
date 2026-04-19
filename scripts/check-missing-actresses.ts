import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

async function check() {
  // 4 unmatched actress names
  const missing = ['ツナマヨ', '九野ひなの', '久和原せいら', '和栗ゆゆ'];
  
  console.log('=== Checking missing actresses in DB ===\n');
  
  for (const name of missing) {
    // Try exact match
    const result = await sql`
      SELECT id, name_ja, name_cn FROM actresses 
      WHERE LOWER(name_ja) = ${name.toLowerCase()}
         OR LOWER(name_cn) = ${name.toLowerCase()}
    `;
    
    if (result.length > 0) {
      console.log(`FOUND: "${name}" ->`, result);
    } else {
      console.log(`NOT IN DB: "${name}"`);
      
      // Try partial match to find similar
      const similar = await sql`
        SELECT id, name_ja FROM actresses 
        WHERE name_ja ILIKE ${'%' + name.slice(0, 2) + '%'}
        LIMIT 5
      `;
      if (similar.length > 0) {
        console.log('  Similar names:', similar.map(s => s.name_ja).join(', '));
      }
    }
  }
  
  // Also check events still with unknown actress_id
  const unknownEvents = await sql`
    SELECT id, title, actress_id FROM events WHERE actress_id = 'unknown'
  `;
  console.log('\n=== Events still with unknown actress_id ===');
  console.log('Count:', unknownEvents.length);
  if (unknownEvents.length > 0) {
    unknownEvents.forEach(e => console.log('-', e.id, e.title));
  }
}

check().catch(console.error);
