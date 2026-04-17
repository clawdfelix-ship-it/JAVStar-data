/**
 * Minnano-AV Scraper
 * 
 * Scrapes actress data from minnano-av.com
 * Updates frequency: daily at 2:00 AM JST
 * 
 * Community-driven site - be respectful
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const BASE_URL = 'https://www.minnano-av.com';
const DELAY_MS = 3000; // More respectful for community site

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<any | null> {
  await delay(DELAY_MS);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9',
        'Referer': BASE_URL,
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
  // Format: 1990年06月12日 or 1990/06/12
  const match = birthdayStr.match(/(\d+)[年/](\d+)[月/](\d+)/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Extract actress profile from listing page
function extractActressFromCard($: any, link: string): ActressData | null {
  try {
    const name_ja = $('[class*="name"]').text().trim() ||
                   $('h3').first().text().trim() ||
                   $('h2').first().text().trim();
    
    if (!name_ja) return null;

    // Extract basic stats from card
    const stats = $('[class*="stat"]').map((_: number, el: any) => $(el).text().trim()).get();
    
    let height: number | null = null;
    let bust: number | null = null;
    let waist: number | null = null;
    let hip: number | null = null;

    for (const stat of stats) {
      const hMatch = stat.match(/(\d{3})cm/);
      if (hMatch) height = parseInt(hMatch[1]);
      
      const bMatch = stat.match(/B(\d+)/);
      if (bMatch) bust = parseInt(bMatch[1]);
      
      const wMatch = stat.match(/W(\d+)/);
      if (wMatch) waist = parseInt(wMatch[1]);
      
      const iMatch = stat.match(/H(\d+)/);
      if (iMatch) hip = parseInt(iMatch[1]);
    }

    const id = link.split('/').pop()?.replace(/\.html$/, '') || link;

    return {
      id,
      name_ja,
      name_cn: '', // Will be derived from name_ja or empty
      birthday: null,
      height,
      bust,
      waist,
      hip,
      debut_date: null,
      avatar_url: extractAvatarUrl($, id),
    };
  } catch {
    return null;
  }
}

// Get avatar URL from page
function extractAvatarUrl($: any, actressId: string): string | null {
  // Look for image in various patterns
  const img = $('[class*="photo"] img').first() ||
              $('[class*="avatar"] img').first() ||
              $('[class*="profile"] img').first() ||
              $('img').first();
  
  if (img.length) {
    const src = img.attr('src') || img.attr('data-src');
    if (src && !src.includes('noimage')) {
      return src;
    }
  }
  return null;
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

  // Find actress cards/links
  const actressLinks: string[] = [];
  $('a[href*="/actress/"]').each((_: number, el: any) => {
    const href = $(el).attr('href');
    if (href) actressLinks.push(href);
  });

  console.log(`Found ${actressLinks.length} actress links`);

  // Process top results (be respectful - don't scrape entire database)
  const uniqueLinks = [...new Set(actressLinks)].slice(0, 100);
  
  for (const link of uniqueLinks) {
    await delay(DELAY_MS);
    
    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
    const page$ = await fetchPage(fullUrl);
    
    if (!page$ || !page$.html()) continue;

    const data = extractActressFromProfile(page$, link);
    if (data) actresses.push(data);
    
    console.log(`Scraped: ${data?.name_ja || link}`);
  }

  console.log(`Total actresses scraped: ${actresses.length}`);
  return actresses;
}

// Extract full profile from actress detail page
function extractActressFromProfile($: any, url: string): ActressData | null {
  try {
    const id = url.split('/').pop()?.replace(/\.html$/, '') || '';
    
    // Get name
    const name_ja = $('[class*="name"]').text().trim() ||
                    $('h1').first().text().trim() ||
                    $('h2').first().text().trim();
    
    if (!name_ja) return null;

    // Parse profile table
    const profileData: Record<string, string> = {};
    $('table tr').each((_: number, row: any) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const label = cells.eq(0).text().trim();
        const value = cells.eq(1).text().trim();
        profileData[label] = value;
      }
    });

    return {
      id,
      name_ja,
      name_cn: '', // Could add Chinese conversion logic
      birthday: parseBirthday(profileData['生年月日'] || profileData['誕生日']),
      height: profileData['身長'] ? parseInt(profileData['身長']) : null,
      bust: profileData['サイズ'] ? parseInt(profileData['サイズ'].match(/B(\d+)/)?.[1] || '0') : null,
      waist: profileData['サイズ'] ? parseInt(profileData['サイズ'].match(/W(\d+)/)?.[1] || '0') : null,
      hip: profileData['サイズ'] ? parseInt(profileData['サイズ'].match(/H(\d+)/)?.[1] || '0') : null,
      debut_date: parseBirthday(profileData['デビュー'] || profileData['AVデビュー']),
      avatar_url: extractAvatarUrl($, id),
    };
  } catch {
    return null;
  }
}

// Scrape all new arrivals (recent debuts)
export async function scrapeNewActresses(): Promise<ActressData[]> {
  console.log('Scraping new actress debuts...');
  
  const actresses: ActressData[] = [];
  
  const $ = await fetchPage(`${BASE_URL}/av_list.html?sort=new`);
  if (!$ || !$.html()) {
    console.log('Failed to load new arrivals page');
    return actresses;
  }

  const actressLinks: string[] = [];
  $('a[href*="/actress/"]').each((_: number, el: any) => {
    const href = $(el).attr('href');
    if (href) actressLinks.push(href);
  });

  const uniqueLinks = [...new Set(actressLinks)].slice(0, 50);
  
  for (const link of uniqueLinks) {
    await delay(DELAY_MS);
    
    const page$ = await fetchPage(`${BASE_URL}${link}`);
    if (!page$ || !page$.html()) continue;

    const data = extractActressFromProfile(page$, link);
    if (data) actresses.push(data);
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