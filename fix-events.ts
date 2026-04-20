import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';
import nodeFetch from 'node-fetch';

const DATABASE_URL = 'postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

const sql = neon(DATABASE_URL);

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
  await delay(DELAY_MS);
  try {
    const response = await nodeFetch(url, {
      headers: {
        'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9',
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    return cheerio.load(html);
  } catch {
    return null;
  }
}

function parseEventDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[^\d]*(\d{1,2}))?[:：]?(\d{2})?/);
  if (match) {
    const [, year, month, day, hour = '0', min = '0'] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:00+09:00`;
  }
  const isoMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1] + 'T00:00:00+09:00';
  return '';
}

async function getEventDateTime(eventId: string): Promise<string> {
  const $ = await fetchPage(`${BASE_URL}/event/${eventId}/`);
  if (!$ || !$('.p-event-info_held-info').length) return '';
  const infoText = $('.p-event-info_held-info-list').first().text().replace(/\s+/g, ' ').trim();
  const dtMatch = infoText.match(/(\d{4}\/\d{1,2}\/\d{1,2}[^\d]*\d{1,2}:\d{2})/);
  return dtMatch ? parseEventDateTime(dtMatch[1]) : '';
}

async function main() {
  const events = await sql`
    SELECT id, actress_id, title, datetime 
    FROM events 
    WHERE actress_id != 'unknown' AND actress_id IS NOT NULL
    ORDER BY id
  ` as any[];
  
  console.log(`Total events to check: ${events.length}`);
  
  let fixed = 0;
  let skipped = 0;
  
  for (const event of events) {
    if (event.datetime && String(event.datetime).match(/^202[56]/)) {
      skipped++;
      continue;
    }
    
    const correctDate = await getEventDateTime(event.id);
    if (correctDate) {
      await sql`UPDATE events SET datetime = ${correctDate} WHERE id = ${event.id}`;
      fixed++;
      console.log(`✓ Fixed ${event.id}: ${correctDate}`);
    }
    
    if ((fixed + skipped) % 100 === 0) {
      console.log(`Progress: ${fixed} fixed, ${skipped} skipped...`);
    }
  }
  
  console.log(`\n✅ Done! Fixed ${fixed} events, skipped ${skipped}`);
}

main().catch(console.error);
