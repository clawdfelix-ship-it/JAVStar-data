import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

interface Actress {
  id: string;
  name_ja: string;
}

async function match() {
  // Get all actresses
  const actresses = await sql<Actress[]>`SELECT id, name_ja FROM actresses`;
  const nameToId = new Map<string, string>();
  actresses.forEach(a => {
    if (a.name_ja) nameToId.set(a.name_ja.toLowerCase(), a.id);
  });

  // Unknown events with extracted names from title
  const unknownEvents = [
    { id: '39385', name: '森日向子', title: '5月 5日（火。祝）森日向子　パチンコ来店' },
    { id: '39384', name: '響つかさ', title: '響つかさ 衝撃官能誕生祭' },
    { id: '39347', name: '橘メアリー', title: '5/30（土）橘メアリーさんイベント in ラスト名古屋 MAX書店' },
  ];

  console.log('Matching unknown events...\n');

  for (const event of unknownEvents) {
    const normalized = event.name.toLowerCase();
    const matchedId = nameToId.get(normalized);
    
    if (matchedId) {
      console.log(`MATCH: "${event.name}" -> ${matchedId}`);
      
      await sql`
        UPDATE events SET actress_id = ${matchedId} WHERE id = ${event.id}
      `;
      console.log(`  → Updated event ${event.id}`);
    } else {
      console.log(`NO MATCH: "${event.name}"`);
      // Try fuzzy
      for (const [name, id] of nameToId.entries()) {
        if (normalized.includes(name.slice(0, 2)) || name.includes(normalized.slice(0, 2))) {
          console.log(`  Fuzzy match: "${event.name}" -> "${name}" (${id})`);
          break;
        }
      }
    }
  }
}

match().catch(console.error);
