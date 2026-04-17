/**
 * Minnano-AV Scraper - Actress List with Pagination Support
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
  age: number | null;
  zodiac: string | null;
  height: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  cup: string | null;
  agency: string | null;
  hobby: string | null;
  debut_date: string | null;
  debut_year: number | null;
  debut_work: string | null;
  blog: string | null;
  official_site: string | null;
  tags: string | null;
  avatar_url: string | null;
}

function parseBirthdayInfo(birthdayStr: string | null): { birthday: string | null; age: number | null; zodiac: string | null } {
  if (!birthdayStr) return { birthday: null, age: null, zodiac: null };
  const dateMatch = birthdayStr.match(/(\d+)年(\d+)月(\d+)日/);
  let birthday: string | null = null;
  if (dateMatch) {
    birthday = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }
  const ageMatch = birthdayStr.match(/現在\s*(\d+)歳/);
  const age = ageMatch ? parseInt(ageMatch[1]) : null;
  const parts = birthdayStr.split('）');
  const zodiacPart = parts.length > 1 ? parts[1].trim() : null;
  return { birthday, age, zodiac: zodiacPart };
}

async function extractActressFromDetailPage($: cheerio.CheerioAPI, url: string): Promise<ActressData | null> {
  try {
    const idMatch = url.match(/actress(\d+)\.html/i);
    const id = idMatch ? idMatch[1] : url.split('/').pop()?.replace('.html', '') || '';
    const h1 = $('h1').first();
    const name_ja = h1.clone().children().remove().end().text().trim() || h1.text().trim().split('（')[0].trim();
    if (!name_ja) return null;

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
            const value = p.text().trim();
            profileData[label] = value;
          }
        });
        return false;
      }
    });

    const avatarImg = $('[class*="act-area"] img').first() || $('img[src*="/p_actress_"]').first();
    let avatar_url = avatarImg.attr('src') || null;
    if (avatar_url && !avatar_url.startsWith('http')) {
      avatar_url = `${BASE_URL}${avatar_url}`;
    }

    const { birthday, age, zodiac } = parseBirthdayInfo(profileData['生年月日'] || null);

    let height: number | null = null;
    let bust: number | null = null;
    let waist: number | null = null;
    let hip: number | null = null;
    let cup: string | null = null;
    const sizeStr = profileData['サイズ'] || '';
    const heightMatch = sizeStr.match(/T(\d+)/);
    const bustMatch = sizeStr.match(/B(\d+)/);
    const waistMatch = sizeStr.match(/W(\d+)/);
    const hipMatch = sizeStr.match(/H(\d+)/);
    const cupMatch = sizeStr.match(/\(([ABCDEFG])カップ\)/);
    if (heightMatch) height = parseInt(heightMatch[1]);
    if (bustMatch) bust = parseInt(bustMatch[1]);
    if (waistMatch) waist = parseInt(waistMatch[1]);
    if (hipMatch) hip = parseInt(hipMatch[1]);
    if (cupMatch) cup = cupMatch[1];

    let debut_year: number | null = null;
    let debut_date: string | null = null;
    const avPeriod = profileData['AV出演期間'] || '';
    const debutMatch = avPeriod.match(/(\d{4})年/);
    if (debutMatch) {
      debut_year = parseInt(debutMatch[1]);
      debut_date = `${debut_year}-01-01`;
    }

    const debutWork = profileData['デビュー作品'] || null;
    const agency = profileData['所属事務所'] || null;
    const hobby = profileData['趣味・特技'] || null;
    const blogMatch = $('a[href*="twitter.com"]').attr('href') || null;
    const officialSiteMatch = $('a[href*="cmore.jp"], a[href*="official"]').attr('href') || null;
    const tagLinks = $('a[href*="tag"]').map((_: number, el: any) => $(el).text().trim()).get();
    const tags = tagLinks.length > 0 ? tagLinks.join(', ') : null;

    return {
      id, name_ja, name_cn: profileData['別名'] || '', birthday, age, zodiac,
      height, bust, waist, hip, cup, agency, hobby, debut_date, debut_year,
      debut_work: debutWork, blog: blogMatch, official_site: officialSiteMatch,
      tags, avatar_url,
    };
  } catch (error) {
    console.error('Error extracting profile:', error);
    return null;
  }
}

async function scrapeListPage(page: number = 1): Promise<string[]> {
  const url = `${BASE_URL}/actress_list.php?page=${page}`;
  console.log(`Fetching list page ${page}...`);
  const $ = await fetchPage(url);
  if (!$ || !$.html()) return [];
  const urls: string[] = [];
  $('a').each((_: number, el: any) => {
    const href = $(el).attr('href') || '';
    if (href.match(/^actress\d+\.html/) || href.match(/\/actress\d+\.html/)) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}/${href.split('?')[0]}`;
      urls.push(fullUrl);
    }
  });
  return [...new Set(urls)];
}

export async function scrapeActresses(count: number = 100, offset: number = 0): Promise<ActressData[]> {
  const startPage = Math.floor(offset / 100) + 1;
  const pageOffset = offset % 100;
  console.log(`Scraping ${count} actresses from minnano-av.com (offset=${offset}, startPage=${startPage})...`);
  const actresses: ActressData[] = [];
  const seenIds = new Set<string>();
  console.log('\n=== Scraping Actress List ===');
  for (let page = startPage; page <= startPage + 50 && actresses.length < count; page++) {
    const urls = await scrapeListPage(page);
    console.log(`  Page ${page}: found ${urls.length} actress URLs`);
    const startIdx = page === startPage ? pageOffset : 0;
    for (let i = startIdx; i < urls.length && actresses.length < count; i++) {
      const url = urls[i];
      const idMatch = url.match(/actress(\d+)\.html/);
      const id = idMatch ? idMatch[1] : '';
      if (id && seenIds.has(id)) continue;
      seenIds.add(id);
      const $ = await fetchPage(url);
      if ($ && $.html()) {
        const data = await extractActressFromDetailPage($, url);
        if (data) {
          actresses.push(data);
          console.log(`  [${actresses.length}] ${data.name_ja} | ${data.birthday} | ${data.height}cm | cup: ${data.cup} | ${data.agency || 'N/A'}`);
        }
      }
    }
  }
  console.log(`\nTotal actresses scraped: ${actresses.length}`);
  return actresses;
}

if (require.main === module) {
  scrapeActresses(100, 0)
    .then(actresses => {
      console.log(`\nScrape complete: ${actresses.length} actresses`);
      const fs = require('fs');
      fs.writeFileSync('scraped-list.json', JSON.stringify(actresses, null, 2));
    })
    .catch(console.error);
}

export { scrapeActresses as default };
