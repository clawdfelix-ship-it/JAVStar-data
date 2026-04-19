import { neon } from '@neondatabase/serverless';
import * as https from 'https';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

async function scrapeEventPage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const targetUrl = url.replace(/^http:/, 'https:');
    https.get(targetUrl, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const match = html.match(/"performer"\s*:\s*\[\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"([^"]+)"/);
        if (match) { resolve(match[1]); return; }
        const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (ogMatch) {
          const actMatch = ogMatch[1].match(/[祝日月火水木金土][\s　）)]*([^\s　#（(【]+?)[\s　]/);
          if (actMatch) { resolve(actMatch[1]); return; }
        }
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const events = await sql`
    SELECT e.id, e.title, e.url, e.actress_id 
    FROM events e 
    WHERE e.actress_id = 'unknown' OR e.actress_id IS NULL
  `;
  
  console.log(`Found ${events.length} events to process`);
  
  let matched = 0;
  let notInDB = 0;
  let failed = 0;
  const notFound: string[] = [];
  const noMatch: string[] = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const url = event.url || `https://www.av-event.jp/event/${event.id}/`;
    const actressName = await scrapeEventPage(url);
    
    if (actressName) {
      const normalized = actressName.toLowerCase();
      const nameLike = '%' + actressName + '%';
      const matchedActresses = await sql`
        SELECT id FROM actresses 
        WHERE LOWER(name_ja) = ${normalized}
           OR name_cn ILIKE ${nameLike}
        LIMIT 1
      `;
      
      if (matchedActresses.length > 0) {
        await sql`UPDATE events SET actress_id = ${matchedActresses[0].id} WHERE id = ${event.id}`;
        matched++;
        process.stdout.write('✓');
      } else {
        notInDB++;
        noMatch.push(actressName);
        process.stdout.write('?');
      }
    } else {
      failed++;
      process.stdout.write('✗');
    }
    
    // Progress every 100
    if ((i + 1) % 100 === 0) {
      console.log(`\n${i+1}/${events.length}: matched=${matched}, notInDB=${notInDB}, failed=${failed}`);
    }
    
    // Small delay to be nice to the server
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n\n=== FINAL RESULT ===`);
  console.log(`Total events: ${events.length}`);
  console.log(`Matched to actress: ${matched}`);
  console.log(`Actress not in DB: ${notInDB}`);
  console.log(`Scrape failed: ${failed}`);
  
  if (noMatch.length > 0) {
    console.log('\nActresses not in DB (sample):');
    const unique = [...new Set(noMatch)].slice(0, 20);
    unique.forEach(n => console.log('-', n));
  }
}

main().catch(console.error);
