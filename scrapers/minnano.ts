/**
 * Minnano-AV Scraper - Full Ranking + New Arrivals
 * 
 * Scrapes 200 actresses: Top 100 ranking + new arrivals
 * Updates frequency: daily at 2:00 AM JST
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const BASE_URL = 'https://www.minnano-av.com';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
  await delay(DELAY_MS);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return cheerio.load(html);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

export interface ActressData {
  id: string;
  name_ja: string;
  name_cn: string;
  birthday: string | null;
  height: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  debut_date: string | null;
  avatar_url: string | null;
}

function parseBirthday(birthdayStr: string | null): string | null {
  if (!birthdayStr) return null;
  const match = birthdayStr.match(/(\d+)[年\-/](\d+)[月\-/](\d+)/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

async function extractActressFromDetailPage($: cheerio.CheerioAPI, url: string): Promise<ActressData | null> {
  try {
    const idMatch = url.match(/actress(\d+)\.html/i);
    const id = idMatch ? idMatch[1] : url.split('/').pop()?.replace('.html', '') || '';
    
    // Get name from h1 - only text nodes, not child elements
    const h1 = $('h1').first();
    const name_ja = h1.clone().children().remove().end().text().trim() ||
                   h1.text().trim().split('（')[0].trim();
    
    if (!name_ja) return null;

    // Find profile table (the one with 生年月日 label)
    const profileData: Record<string, string> = {};
    
    $('table').each((tableIdx: number, table: any) => {
      const rows = $(table).find('tr');
      let hasProfileLabels = false;
      
      rows.each((_: number, row: any) => {
        const span = $(row).find('span').first();
        if (span.length && span.text().includes('年月日')) {
          hasProfileLabels = true;
        }
      });
      
      if (hasProfileLabels) {
        rows.each((_: number, row: any) => {
          const span = $(row).find('span').first();
          const p = $(row).find('p').first();
          if (span.length && p.length) {
            const label = span.text().trim();
            const value = p.text().trim().split('（')[0].trim();
            profileData[label] = value;
          }
        });
        return false;
      }
    });

    // Get avatar
    const avatarImg = $('[class*="act-area"] img').first() || $('img[src*="/p_actress_"]').first();
    let avatar_url = avatarImg.attr('src') || null;
    if (avatar_url && !avatar_url.startsWith('http')) {
      avatar_url = `${BASE_URL}${avatar_url}`;
    }

    // Parse size info
    let height: number | null = null;
    let bust: number | null = null;
    let waist: number | null = null;
    let hip: number | null = null;
    
    const sizeStr = profileData['サイズ'] || '';
    const heightMatch = sizeStr.match(/T(\d+)/);
    const bustMatch = sizeStr.match(/B(\d+)/);
    const waistMatch = sizeStr.match(/W(\d+)/);
    const hipMatch = sizeStr.match(/H(\d+)/);
    
    if (heightMatch) height = parseInt(heightMatch[1]);
    if (bustMatch) bust = parseInt(bustMatch[1]);
    if (waistMatch) waist = parseInt(waistMatch[1]);
    if (hipMatch) hip = parseInt(hipMatch[1]);

    // Parse debut date
    let debut_date: string | null = null;
    const avPeriod = profileData['AV出演期間'] || '';
    const debutMatch = avPeriod.match(/(\d{4})年/);
    if (debutMatch) {
      debut_date = `${debutMatch[1]}-01-01`;
    }

    return {
      id,
      name_ja,
      name_cn: profileData['別名'] || '',
      birthday: parseBirthday(profileData['生年月日']),
      height,
      bust,
      waist,
      hip,
      debut_date,
      avatar_url,
    };
  } catch (error) {
    console.error('Error extracting profile:', error);
    return null;
  }
}

// Scrape ranking page (returns URLs of actresses)
async function scrapeRankingPage(page: number = 1): Promise<string[]> {
  const url = page === 1 
    ? `${BASE_URL}/ranking_actress.php`
    : `${BASE_URL}/ranking_actress.php?page=${page}`;
    
  console.log(`Fetching ranking page ${page}...`);
  const $ = await fetchPage(url);
  if (!$ || !$.html()) return [];

  const urls: string[] = [];
  const table = $('table').first();
  const rows = table.find('tr');

  for (let i = 1; i < rows.length; i++) {
    const row = rows.eq(i);
    const cells = row.find('td');
    if (cells.length < 3) continue;
    
    const nameCell = cells.eq(2);
    const nameLink = nameCell.find('h2.ttl a');
    const href = nameLink.attr('href');
    
    if (href) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}/${href}`;
      urls.push(fullUrl);
    }
  }
  
  return urls;
}

// Scrape new arrivals page
async function scrapeNewArrivalsPage(page: number = 1): Promise<string[]> {
  const url = page === 1
    ? `${BASE_URL}/ranking_actress.php?daily`
    : `${BASE_URL}/ranking_actress.php?daily&page=${page}`;
    
  console.log(`Fetching new arrivals page ${page}...`);
  const $ = await fetchPage(url);
  if (!$ || !$.html()) return [];

  const urls: string[] = [];
  const table = $('table').first();
  const rows = table.find('tr');

  for (let i = 1; i < rows.length; i++) {
    const row = rows.eq(i);
    const cells = row.find('td');
    if (cells.length < 3) continue;
    
    const nameCell = cells.eq(2);
    const nameLink = nameCell.find('h2.ttl a');
    const href = nameLink.attr('href');
    
    if (href) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}/${href}`;
      urls.push(fullUrl);
    }
  }
  
  return urls;
}

// Main scrape function
export async function scrapeActresses(count: number = 200): Promise<ActressData[]> {
  console.log(`Scraping ${count} actresses from minnano-av.com...`);
  
  const actresses: ActressData[] = [];
  const seenIds = new Set<string>();
  
  // Scrape ranking pages
  console.log('\n=== Scraping Ranking ===');
  for (let page = 1; page <= 5 && actresses.length < count; page++) {
    const urls = await scrapeRankingPage(page);
    console.log(`  Page ${page}: found ${urls.length} actress URLs`);
    
    for (const url of urls) {
      if (actresses.length >= count) break;
      
      const idMatch = url.match(/actress(\d+)\.html/);
      const id = idMatch ? idMatch[1] : '';
      
      if (id && seenIds.has(id)) continue;
      seenIds.add(id);
      
      const $ = await fetchPage(url);
      if ($ && $.html()) {
        const data = await extractActressFromDetailPage($, url);
        if (data) {
          actresses.push(data);
          console.log(`  [${actresses.length}] ${data.name_ja.split('（')[0]} - birthday=${data.birthday}, height=${data.height}`);
        }
      }
      
      if (actresses.length >= count) break;
    }
  }
  
  // Scrape new arrivals if needed
  if (actresses.length < count) {
    console.log('\n=== Scraping New Arrivals ===');
    for (let page = 1; page <= 3 && actresses.length < count; page++) {
      const urls = await scrapeNewArrivalsPage(page);
      console.log(`  Page ${page}: found ${urls.length} actress URLs`);
      
      for (const url of urls) {
        if (actresses.length >= count) break;
        
        const idMatch = url.match(/actress(\d+)\.html/);
        const id = idMatch ? idMatch[1] : '';
        
        if (id && seenIds.has(id)) continue;
        seenIds.add(id);
        
        const $ = await fetchPage(url);
        if ($ && $.html()) {
          const data = await extractActressFromDetailPage($, url);
          if (data) {
            actresses.push(data);
            console.log(`  [${actresses.length}] ${data.name_ja.split('（')[0]} - birthday=${data.birthday}, height=${data.height}`);
          }
        }
      }
    }
  }

  console.log(`\nTotal actresses scraped: ${actresses.length}`);
  return actresses;
}

// Run if called directly
if (require.main === module) {
  scrapeActresses(200)
    .then(actresses => {
      console.log(`\nScrape complete: ${actresses.length} actresses`);
      console.log(JSON.stringify(actresses.slice(0, 5), null, 2));
    })
    .catch(console.error);
}

export { scrapeActresses as default };