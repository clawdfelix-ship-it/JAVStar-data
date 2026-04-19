import { neon } from '@neondatabase/serverless';
import * as https from 'https';
import * as fs from 'fs';

const DATABASE_URL = "postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const sql = neon(DATABASE_URL);

async function scrapeEventPage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const targetUrl = url.replace(/^http:/, 'https:');
    https.get(targetUrl, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        // Extract from JSON-LD: "performer" -> "name"
        const match = html.match(/"performer"\s*:\s*\[\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"([^"]+)"/);
        if (match) {
          resolve(match[1]);
          return;
        }
        // Fallback: og:title
        const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (ogMatch) {
          const title = ogMatch[1];
          // Extract actress from title like "5月 5日（火。祝）森日向子　パチンコ来店"
          const actMatch = title.match(/[祝日月火水木金土][\s　）)]*([^\s　#（(【]+?)[\s　]/);
          if (actMatch) {
            resolve(actMatch[1]);
            return;
          }
        }
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  // Get all events with unknown actress_id from DB
  const events = await sql`
    SELECT e.id, e.title, e.url, e.actress_id 
    FROM events e 
    WHERE e.actress_id = 'unknown' OR e.actress_id IS NULL
  `;
  
  console.log(`Found ${events.length} events with unknown actress_id`);
  
  // Batch process - let's try 20 first to test speed
  const batch = events.slice(0, 20);
  let success = 0;
  
  console.log('\nProcessing batch of 20...');
  for (const event of batch) {
    const url = event.url || `https://www.av-event.jp/event/${event.id}/`;
    const actressName = await scrapeEventPage(url);
    
    if (actressName) {
      // Try to find matching actress
      const matched = await sql`
        SELECT id FROM actresses 
        WHERE LOWER(name_ja) = ${actressName.toLowerCase()}
           OR name_cn ILIKE ${'%' + actressName + '%'}
        LIMIT 1
      `;
      
      if (matched.length > 0) {
        await sql`UPDATE events SET actress_id = ${matched[0].id} WHERE id = ${event.id}`;
        console.log(`✓ ${event.id}: ${actressName} -> ${matched[0].id}`);
        success++;
      } else {
        console.log(`✗ ${event.id}: "${actressName}" - no match in DB`);
      }
    } else {
      console.log(`✗ ${event.id}: failed to scrape`);
    }
  }
  
  console.log(`\nBatch result: ${success}/20 successful`);
}

main().catch(console.error);
