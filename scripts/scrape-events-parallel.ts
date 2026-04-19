import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

interface Event {
  id: string;
  url: string;
  title: string;
  actress_name?: string;
}

// Get events with unknown actress_id from JSON
const allEvents: any[] = JSON.parse(fs.readFileSync('scraped-events-all.json', 'utf8'));
const unknownEvents = allEvents.filter(e => !e.actress_id || e.actress_id === 'unknown');

console.log(`Total events to scrape: ${unknownEvents.length}`);

// Extract actress name from HTML using regex
function extractActress(html: string): string | null {
  // Try JSON-LD first
  const jsonMatch = html.match(/"performer"\s*:\s*\[\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
  if (jsonMatch) return jsonMatch[1];
  
  // Try meta og:title
  const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (ogMatch) {
    // og:title format: "EventName - SiteName" or just "EventName"
    const title = ogMatch[1];
    // Event title usually starts with actress name then event details
    // e.g. "5月 5日（火。祝）森日向子　パチンコ来店"
    const match = title.match(/[祝日月火水木金土][\s　）)]*([^\s　#（(【]+?[さんちゃん嬢様]?)/);
    if (match) return match[1];
  }
  
  return null;
}

async function scrapeEvent(event: Event): Promise<{ id: string; name: string | null }> {
  return new Promise((resolve) => {
    const url = event.url.replace(/^http:/, 'https:');
    
    https.get(url, { timeout: 10000 }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const name = extractActress(html);
        resolve({ id: event.id, name });
      });
    }).on('error', () => {
      resolve({ id: event.id, name: null });
    });
  });
}

async function main() {
  // Test with first 5 events
  const testEvents = unknownEvents.slice(0, 5);
  
  console.log('\nTesting first 5 events...');
  for (const event of testEvents) {
    const result = await scrapeEvent(event);
    console.log(`${event.id}: ${result.name || 'NULL'} <- "${event.title}"`);
  }
}

main().catch(console.error);
