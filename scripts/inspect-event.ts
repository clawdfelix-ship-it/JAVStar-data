import nodeFetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Get event links from page 1
  await delay(DELAY_MS);
  const res = await nodeFetch(`${BASE_URL}/new_event/`, {
    headers: {
      'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en-US;q=0.9',
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const links: string[] = [];
  $('a[href*="/event/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) links.push(href.startsWith('http') ? href : BASE_URL + href);
  });
  
  const uniqueLinks = [...new Set(links)];
  console.log('Unique event links:', uniqueLinks.length);
  console.log('First 3 links:', uniqueLinks.slice(0, 3));
  
  const firstLink = uniqueLinks[0];
  if (!firstLink) return;
  
  console.log('\nFetching:', firstLink);
  await delay(DELAY_MS);
  const eventRes = await nodeFetch(firstLink, {
    headers: {
      'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en-US;q=0.9',
    }
  });
  const eventHtml = await eventRes.text();
  const $e = cheerio.load(eventHtml);
  
  console.log('\nTitle:', $e('title').text().trim());
  console.log('\nh1:', $e('h1').map((_, el) => $e(el).text().trim().slice(0, 80)).get());
  console.log('\nh2:', $e('h2').map((_, el) => $e(el).text().trim().slice(0, 80)).get());
  console.log('\n[class*="name"]:', $e('[class*="name"]').map((_, el) => `${$e(el).attr('class')}: "${$e(el).text().trim().slice(0, 60)}"`).get());
  console.log('\n[class*="actress"]:', $e('[class*="actress"]').map((_, el) => `${$e(el).attr('class')}: "${$e(el).text().trim().slice(0, 60)}"`).get());
  console.log('\n[class*="title"]:', $e('[class*="title"]').map((_, el) => `${$e(el).attr('class')}: "${$e(el).text().trim().slice(0, 60)}"`).get());
  console.log('\n[class*="date"]:', $e('[class*="date"]').map((_, el) => `${$e(el).attr('class')}: "${$e(el).text().trim().slice(0, 60)}"`).get());
  console.log('\n[class*="venue"]:', $e('[class*="venue"]').map((_, el) => `${$e(el).attr('class')}: "${$e(el).text().trim().slice(0, 60)}"`).get());
  console.log('\n[class*="place"]:', $e('[class*="place"]').map((_, el) => `${$e(el).attr('class')}: "${$e(el).text().trim().slice(0, 60)}"`).get());
  
  console.log('\nTable tr:');
  $e('table tr').each((_, tr) => {
    const cells = $e(tr).find('td').map((_, td) => $e(td).text().trim()).get();
    if (cells.length >= 2) console.log('  ', cells.join(' | '));
  });
  
  // Article content
  console.log('\narticle content:', $e('article').text().trim().slice(0, 300));
}

main().catch(console.error);
