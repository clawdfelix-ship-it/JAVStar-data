import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

try { process.loadEnvFile(); } catch {}
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

// Get events with unknown actress_id
interface Event {
  id: string;
  url: string;
  title: string;
}

const events: Event[] = JSON.parse(fs.readFileSync('scraped-events-all.json', 'utf8'))
  .filter((e: any) => !e.actress_id || e.actress_id === 'unknown');

// We need to scrape each event page to get actress name
// Let's test with a few first

async function testScrape() {
  console.log('Testing event page scraping...');
  
  const testIds = ['39385', '39384', '39347'];
  
  for (const id of testIds) {
    const event = events.find((e: any) => e.id === id);
    if (!event) {
      console.log(`Event ${id} not found in JSON`);
      continue;
    }
    
    console.log(`\nFetching event ${id}: ${event.title}`);
    console.log(`URL: ${event.url}`);
  }
}

testScratch().catch(console.error);
