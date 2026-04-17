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
    if (!response.ok) return null;
    const html = await response.text();
    return cheerio.load(html);
  } catch (e) {
    return null;
  }
}

async function checkPagination() {
  console.log('Checking pagination on new_event page...');
  const $ = await fetchPage(`${BASE_URL}/new_event/`);
  if (!$ || !$.html()) {
    console.log('Failed to load page');
    return;
  }
  
  const allLinks = $('a[href*="page"]');
  if (allLinks.length > 0) {
    console.log(`Found ${allLinks.length} links with 'page' in href:`);
    allLinks.each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (href) console.log(`  "${text}" -> ${href}`);
    });
  }
  
  // Try numeric pagination patterns
  const numericPageLinks = $('a[href*="/new_event/page"]');
  if (numericPageLinks.length > 0) {
    console.log(`\nNumeric page links: ${numericPageLinks.length}`);
    numericPageLinks.each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (href) console.log(`  "${text}" -> ${href}`);
    });
  }
  
  // Check last page link
  const lastPage = $('a[class*="last"], a[class*="end"], a[title*="最後"], a[title*="last"]');
  if (lastPage.length > 0) {
    console.log('\nLast page link:', lastPage.first().attr('href'));
  }
  
  console.log('\nTotal event links on new_event:', $('a[href*="/event/"]').length);
  
  // Try to get page 2
  console.log('\nTrying page 2...');
  const $2 = await fetchPage(`${BASE_URL}/new_event/page/2/`);
  if ($2 && $2.html()) {
    console.log('Page 2 loaded! Links:', $2('a[href*="/event/"]').length);
  }
}

checkPagination().catch(console.error);
