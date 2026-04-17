/**
 * AV Event Scraper
 * 
 * Scrapes event data from av-event.jp
 * Updates frequency: every 1 hour
 * 
 * Respect robots.txt - check first
 * Rate limit: 2000ms between requests
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if we should scrape (basic robots.txt respect)
async function canScrape(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/robots.txt`, {
      headers: { 'User-Agent': 'AV-Intelligence-Bot/1.0 (contact@av-intelligence.local)' }
    });
    if (!response.ok) return true; // assume allowed if not found
    
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes(path) || line.includes('Disallow')) {
        // Check if it's a general rule
        if (line.startsWith('Disallow: /')) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return true; // assume allowed on error
  }
}

// Fetch a page with rate limiting
async function fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
  await delay(DELAY_MS);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
        'Accept': 'text/html,application/xhtml+xml',
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

// Extract actress name from event page
function extractActressName($: any): string | null {
  // Look for actress name in various patterns on event pages
  const possibleSelectors = [
    '.actress-name',
    '.performer-name', 
    '[class*="actress"]',
    '[class*="name"]',
    'h1',
  ];

  for (const selector of possibleSelectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length < 50) {
        return text;
      }
    }
  }

  // Fallback: look at page title
  const title = $('title').text();
  const match = title.match(/^(.+?)\s*[-|]/);
  if (match) {
    return match[1].trim();
  }

  return null;
}

// Extract event data from a single event card
function extractEventCard($: any, eventUrl: string): Partial<EventData> | null {
  try {
    const title = $('[class*="title"]').text().trim() ||
                  $('h2').first().text().trim() ||
                  $('h3').first().text().trim();
    
    const datetime = $('[class*="date"]').text().trim() ||
                     $('[class*="time"]').text().trim();
    
    const venue = $('[class*="venue"]').text().trim() ||
                 $('[class*="place"]').text().trim();

    if (!title) return null;

    return {
      title,
      venue: venue || '未指定',
      datetime: parseEventDateTime(datetime),
      url: eventUrl,
    };
  } catch {
    return null;
  }
}

// Parse date/time string into ISO format
function parseEventDateTime(dateStr: string): string {
  // Japanese date format: 2026年04月17日 17:00
  const match = dateStr.match(/(\d+)年(\d+)月(\d+)日\s*(\d+):?(\d+)?/);
  if (match) {
    const [, year, month, day, hour = '0', min = '0'] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:00+09:00`;
  }
  return new Date().toISOString();
}

interface EventData {
  id: string;
  actress_id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
}

// Scrape all upcoming events
export async function scrapeUpcomingEvents(): Promise<EventData[]> {
  console.log('Starting av-event.jp scraper...');
  
  const events: EventData[] = [];
  
  // Scrape main pages for upcoming events
  const pagesToScrape = [
    '/new_event/',
    '/search/',  // search page
  ];

  for (const pagePath of pagesToScrape) {
    const $ = await fetchPage(`${BASE_URL}${pagePath}`);
    if (!$ || !$.html()) {
      console.log(`Failed to load ${pagePath}, skipping`);
      continue;
    }

    // Extract event links
    const eventLinks: string[] = [];
    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('page=')) {
        eventLinks.push(href);
      }
    });

    console.log(`Found ${eventLinks.length} event links on ${pagePath}`);

    // Deduplicate
    const uniqueLinks = [...new Set(eventLinks)];
    
    // Process each event page
    for (const eventPath of uniqueLinks.slice(0, 50)) { // Limit per page to be respectful
      await delay(DELAY_MS);
      
      const event$ = await fetchPage(`${BASE_URL}${eventPath}`);
      if (!event$ || !event$.html()) continue;

      const actressName = extractActressName(event$);
      if (!actressName) continue;

      const eventData = extractEventCard(event$, `${BASE_URL}${eventPath}`);
      if (!eventData) continue;

      events.push({
        id: eventPath.split('/').pop() || eventPath,
        actress_id: actressName, // Will resolve to ID later
        title: eventData.title || 'Unknown Event',
        venue: eventData.venue || '',
        prefecture: extractPrefecture(eventData.venue || ''),
        datetime: eventData.datetime || '',
        event_type: extractEventType(eventData.title || ''),
        url: eventData.url || '',
      });
    }
  }

  console.log(`Total events scraped: ${events.length}`);
  return events;
}

// Extract prefecture from venue string
function extractPrefecture(venue: string): string {
  const prefectures = [
    '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
    '茨城', '栃木', '埼玉', '千葉', '東京', '神奈川',
    '新潟', '富山', '石川', '福井', '山梨', '長野',
    '岐阜', '静岡', '愛知', '三重',
    '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
    '鳥取', '島根', '岡山', '広島', '山口',
    '徳島', '香川', '愛媛', '高知',
    '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'
  ];

  for (const pref of prefectures) {
    if (venue.includes(pref)) return pref;
  }
  return '東京';
}

// Extract event type from title
function extractEventType(title: string): string {
  const types = [
    { key: 'sign', patterns: ['サイン会', 'サイン'] },
    { key: 'debut', patterns: ['デビュー', '出道'] },
    { key: 'live', patterns: ['LIVE', 'ライブ', '出演'] },
    { key: 'talk', patterns: ['トーク', '座谈'] },
    { key: 'sale', patterns: ['発売', '販売'] },
  ];

  for (const { key, patterns } of types) {
    for (const pattern of patterns) {
      if (title.includes(pattern)) return key;
    }
  }
  return 'other';
}

// Scrape actress event counts (for ranking)
export async function scrapeActressEventCounts(): Promise<Map<string, number>> {
  console.log('Scraping actress event counts...');
  
  const counts = new Map<string, number>();
  
  // Scrape search/actress pages to count events per actress
  const $ = await fetchPage(`${BASE_URL}/search/`);
  if (!$ || !$.html()) {
    console.log('Failed to load search page');
    return counts;
  }

  // Get all actress links from search
  const actressLinks = new Set<string>();
  $('a[href*="/actress/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) actressLinks.add(href);
  });

  console.log(`Found ${actressLinks.size} actress links`);

  for (const link of actressLinks) {
    await delay(DELAY_MS);
    
    const actress$ = await fetchPage(`${BASE_URL}${link}`);
    if (!actress$ || !actress$.html()) continue;

    // Count events on their page
    const name = extractActressName(actress$) || link;
    const eventCount = actress$('[class*="event"]').length || actress$('tr').length - 1;

    // Count from table rows (common pattern)
    const rows = actress$('table tr').length;
    counts.set(name, Math.max(eventCount, rows > 0 ? rows - 1 : 0));
  }

  return counts;
}

// Main entry point
if (require.main === module) {
  scrapeUpcomingEvents()
    .then(events => {
      console.log(`\nScrape complete: ${events.length} events found`);
      console.log(JSON.stringify(events.slice(0, 3), null, 2));
    })
    .catch(console.error);
}

export { scrapeUpcomingEvents as default };