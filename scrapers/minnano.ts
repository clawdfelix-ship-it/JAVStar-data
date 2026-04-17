/**
 * Minnano-AV Scraper
 * 
 * Scrapes actress data from minnano-av.com
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

// Parse birthday string to ISO format
function parseBirthday(birthdayStr: string | null): string | null {
  if (!birthdayStr) return null;
  // Format: 2006年01月08日 or 2006/01/08 or 2006-01-08
  const match = birthdayStr.match(/(\d+)[年\-/](\d+)[月\-/](\d+)/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Extract actress profile from detail page
async function extractActressFromDetailPage($: cheerio.CheerioAPI, url: string): Promise<ActressData | null> {
  try {
    // Get ID from URL like actress993545.html
    const idMatch = url.match(/actress(\d+)\.html/i);
    const id = idMatch ? idMatch[1] : url.split('/').pop()?.replace('.html', '') || '';
    
    // Get name from h1 - only text nodes, not child elements
    const h1 = $('h1').first();
    const name_ja = h1.clone().children().remove().end().text().trim() ||
                   h1.text().trim().split('（')[0].trim();
    
    if (!name_ja) return null;

    // Profile data is in table 1 (after the ratings table)
    // Find the table that contains span-based labels like 生年月日
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
        // Parse this table's profile data
        rows.each((_: number, row: any) => {
          const span = $(row).find('span').first();
          const p = $(row).find('p').first();
          if (span.length && p.length) {
            const label = span.text().trim();
            const value = p.text().trim().split('（')[0].trim();
            profileData[label] = value;
          }
        });
        return false; // break
      }
    });

    // Get avatar from profile image
    const avatarImg = $('[class*="act-area"] img').first() ||
                     $('img[src*="/p_actress_"]').first();
    let avatar_url = avatarImg.attr('src') || null;
    if (avatar_url && !avatar_url.startsWith('http')) {
      avatar_url = `${BASE_URL}${avatar_url}`;
    }

    // Parse size info from "サイズ" field (e.g., "T158 / B95 / W56 / H88 / S")
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

    // Parse debut date from "AV出演期間" or "デビュー作品"
    let debut_date: string | null = null;
    const avPeriod = profileData['AV出演期間'] || '';
    const debutMatch = avPeriod.match(/(\d{4})年/);
    if (debutMatch) {
      debut_date = `${debutMatch[1]}-01-01`; // Just year
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

// Scrape actress ranking page (top 100)
export async function scrapeActressRanking(): Promise<ActressData[]> {
  console.log('Scraping minnano-av.com actress ranking...');
  
  const actresses: ActressData[] = [];
  
  const $ = await fetchPage(`${BASE_URL}/ranking_actress.php`);
  if (!$ || !$.html()) {
    console.log('Failed to load ranking page');
    return actresses;
  }

  // Find the ranking table
  const table = $('table').first();
  const rows = table.find('tr');
  console.log(`Found ${rows.length} table rows (including header)`);

  // Parse each row (skip header row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows.eq(i);
    const cells = row.find('td');
    
    if (cells.length < 3) continue;
    
    // Get rank
    const rank = cells.eq(0).text().trim();
    
    // Get name from h2.ttl a in third cell
    const nameCell = cells.eq(2);
    const nameLink = nameCell.find('h2.ttl a');
    const name_ja = nameLink.text().trim();
    
    // Get detail page URL
    const href = nameLink.attr('href');
    
    if (!name_ja || !href) continue;
    
    console.log(`[${i}] Rank ${rank}: ${name_ja}`);
    
    // Scrape detail page for full profile
    await delay(DELAY_MS);
    const detailUrl = href.startsWith('http') ? href : `${BASE_URL}/${href}`;
    const detail$ = await fetchPage(detailUrl);
    
    if (detail$ && detail$.html()) {
      const data = await extractActressFromDetailPage(detail$, detailUrl);
      if (data) {
        actresses.push(data);
        console.log(`  -> birthday=${data.birthday}, height=${data.height}, B${data.bust || '?'}W${data.waist || '?'}H${data.hip || '?'}`);
      }
    }
    
    // Limit to 20 for testing
    if (actresses.length >= 20) {
      console.log('Reached limit of 20 actresses');
      break;
    }
  }

  console.log(`Total actresses scraped: ${actresses.length}`);
  return actresses;
}

// Scrape all new arrivals (recent debuts)
export async function scrapeNewActresses(): Promise<ActressData[]> {
  console.log('Scraping new actress debuts...');
  
  const actresses: ActressData[] = [];
  
  const $ = await fetchPage(`${BASE_URL}/ranking_actress.php?daily`);
  if (!$ || !$.html()) {
    console.log('Failed to load new arrivals page');
    return actresses;
  }

  const table = $('table').first();
  const rows = table.find('tr');

  for (let i = 1; i < Math.min(rows.length, 51); i++) {
    const row = rows.eq(i);
    const cells = row.find('td');
    
    if (cells.length < 3) continue;
    
    const nameCell = cells.eq(2);
    const nameLink = nameCell.find('h2.ttl a');
    const name_ja = nameLink.text().trim();
    const href = nameLink.attr('href');
    
    if (!name_ja || !href) continue;
    
    await delay(DELAY_MS);
    const detailUrl = href.startsWith('http') ? href : `${BASE_URL}/${href}`;
    const detail$ = await fetchPage(detailUrl);
    
    if (detail$ && detail$.html()) {
      const data = await extractActressFromDetailPage(detail$, detailUrl);
      if (data) {
        actresses.push(data);
      }
    }
  }

  return actresses;
}

// Main
if (require.main === module) {
  scrapeActressRanking()
    .then(actresses => {
      console.log(`\nScrape complete: ${actresses.length} actresses found`);
      console.log(JSON.stringify(actresses.slice(0, 3), null, 2));
    })
    .catch(console.error);
}

export { scrapeActressRanking as default };