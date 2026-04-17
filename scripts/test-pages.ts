import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEventLinks(url: string): Promise<string[]> {
  await delay(DELAY_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9',
      }
    });
    if (!response.ok) return [];
    const html = await response.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href);
    });
    return links;
  } catch (e) {
    return [];
  }
}

async function main() {
  const links1 = await getEventLinks(`${BASE_URL}/new_event/`);
  const links2 = await getEventLinks(`${BASE_URL}/new_event/?paged=2`);
  const links3 = await getEventLinks(`${BASE_URL}/new_event/?paged=3`);
  
  console.log('Page 1 event links:', links1.length);
  console.log('Page 2 event links:', links2.length);
  console.log('Page 3 event links:', links3.length);
  
  const set1 = new Set(links1);
  const set2 = new Set(links2);
  const set3 = new Set(links3);
  
  const only2 = links2.filter(l => !set1.has(l));
  const only3 = links3.filter(l => !set1.has(l) && !set2.has(l));
  
  console.log('Unique to page 2:', only2.length);
  console.log('Unique to page 3:', only3.length);
  console.log('Total unique across 3 pages:', new Set([...links1, ...links2, ...links3]).size);
  
  // Check all pages up to 10 to find total
  let totalUnique = new Set(links1);
  for (let page = 2; page <= 10; page++) {
    const links = await getEventLinks(`${BASE_URL}/new_event/?paged=${page}`);
    if (links.length === 0) {
      console.log(`\nLast page at paged=${page - 1}`);
      break;
    }
    links.forEach(l => totalUnique.add(l));
    console.log(`Page ${page}: ${links.length} links, cumulative unique: ${totalUnique.size}`);
  }
  console.log('\nTotal unique event links across all pages:', totalUnique.size);
}

main().catch(console.error);
