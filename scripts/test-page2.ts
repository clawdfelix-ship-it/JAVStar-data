import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string) {
  await delay(DELAY_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9',
      }
    });
    console.log(`Fetched ${url}: status=${response.status}`);
    if (!response.ok) return null;
    const html = await response.text();
    return cheerio.load(html);
  } catch (e: any) {
    console.log(`Error fetching ${url}: ${e.message}`);
    return null;
  }
}

async function main() {
  // Try different URL patterns
  const patterns = [
    '/new_event/',
    '/new_event/page/2/',
    '/new_event/?paged=2',
    '/new_event/?page=2',
    '/event/',
    '/search/',
  ];
  
  for (const p of patterns) {
    const $ = await fetchPage(`${BASE_URL}${p}`);
    if ($ && $.html()) {
      const eventLinks = $('a[href*="/event/"]').length;
      console.log(`  -> ${eventLinks} event links`);
    }
  }
}

main().catch(console.error);
