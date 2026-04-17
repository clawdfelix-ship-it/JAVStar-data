/**
 * AV Event Scraper - Multi-page, proper selectors
 * Scrapes event data from av-event.jp
 * Updates frequency: every 1 hour
 * Rate limit: 2000ms between requests
 */

import * as cheerio from 'cheerio';
import nodeFetch from 'node-fetch';

const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
  await delay(DELAY_MS);
  try {
    const response = await nodeFetch(url, {
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

export interface EventData {
  id: string;
  actress_id: string;
  actress_name: string;
  event_name: string;
  event_date: string;
  event_type: string;
  location: string;
  description: string;
  url: string;
  created_at: string;
}

function parseEventDateTime(dateStr: string): string {
  const match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[^\d]*(\d{1,2}))?[:：]?(\d{2})?/);
  if (match) {
    const [, year, month, day, hour = '0', min = '0'] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:00+09:00`;
  }
  const isoMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1] + 'T00:00:00+09:00';
  return new Date().toISOString();
}

function extractEventType(title: string, categoryText: string): string {
  const combined = title + ' ' + categoryText;
  const types = [
    { key: 'sign', patterns: ['サイン会', 'サイン', 'sign'] },
    { key: 'debut', patterns: ['デビュー', '出道', 'AV deb'] },
    { key: 'live', patterns: ['LIVE', 'ライブ', '出演'] },
    { key: 'talk', patterns: ['トーク', '座谈'] },
    { key: 'release', patterns: ['リリース', '発売', 'release', 'DVD販売'] },
    { key: 'sale', patterns: ['販売イベント', '販売'] },
  ];
  for (const { key, patterns } of types) {
    for (const p of patterns) {
      if (combined.includes(p)) return key;
    }
  }
  return 'other';
}

async function extractEventData($: cheerio.CheerioAPI, eventUrl: string): Promise<EventData | null> {
  try {
    // Actress name - .notranslate child inside the cast element
    const actressName = $('.p-event-info_detail-info--cast .notranslate').first().text().trim();
    if (!actressName) return null;

    // Title
    const titleEl = $('h1.m-ttl-event_tx');
    let title = titleEl.text().trim();
    if (!title) title = $('title').text().split(' - ')[0].trim();

    // Date and venue from held-info-list
    let dateStr = '';
    let venue = '未指定';
    let infoText = '';
    const slots = $('.p-event-info_held-info');

    if (slots.length > 0) {
      // Use first slot's held-info-list
      infoText = $(slots[0]).find('.p-event-info_held-info-list').text().replace(/\s+/g, ' ').trim();
    } else {
      // Single event - try held-info-list directly
      infoText = $('.p-event-info_held-info-list').first().text().replace(/\s+/g, ' ').trim();
    }

    if (infoText) {
      const dtMatch = infoText.match(/(\d{4}\/\d{1,2}\/\d{1,2}[^\d]*\d{1,2}:\d{2})/);
      dateStr = dtMatch ? dtMatch[1] : '';
      const venueMatch = infoText.match(/会場情報\s*(.+?)\s*住所/);
      venue = venueMatch ? venueMatch[1].trim() : '未指定';
    }

    const categoryText = $('.p-event-info_search-conditions').text().trim();
    const id = eventUrl.split('/').filter(Boolean).pop() || eventUrl;

    return {
      id,
      actress_id: actressName,
      actress_name: actressName,
      event_name: title,
      event_date: parseEventDateTime(dateStr),
      event_type: extractEventType(title, categoryText),
      location: venue,
      description: infoText.slice(0, 500),
      url: eventUrl,
      created_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Error extracting event:', e);
    return null;
  }
}

// Main scraper - handles pagination
export async function scrapeEvents(): Promise<EventData[]> {
  console.log('Starting multi-page av-event.jp scraper...');
  const events: EventData[] = [];
  const seenIds = new Set<string>();

  const maxPages = 20;
  let noNewEventsCount = 0;

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1
      ? `${BASE_URL}/new_event/`
      : `${BASE_URL}/new_event/?paged=${page}`;

    console.log(`\nScraping page ${page}...`);
    const $ = await fetchPage(pageUrl);
    if (!$ || !$.html()) {
      console.log(`  Failed to load page ${page}, stopping`);
      break;
    }

    const eventLinks: string[] = [];
    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/event/') && !href.includes('page=')) {
        eventLinks.push(href.startsWith('http') ? href : BASE_URL + href);
      }
    });

    const uniqueLinks = [...new Set(eventLinks)];
    console.log(`  Found ${uniqueLinks.length} event links on page ${page}`);

    if (uniqueLinks.length === 0) {
      noNewEventsCount++;
      if (noNewEventsCount >= 2) {
        console.log('  No more event links, stopping pagination');
        break;
      }
      continue;
    }

    let pageNewEvents = 0;
    for (const eventPath of uniqueLinks) {
      const eventId = eventPath.split('/').filter(Boolean).pop() || eventPath;
      if (seenIds.has(eventId)) continue;
      seenIds.add(eventId);

      const event$ = await fetchPage(eventPath);
      if (!event$ || !event$.html()) continue;

      const eventData = await extractEventData(event$, eventPath);
      if (!eventData) continue;

      events.push(eventData);
      pageNewEvents++;
      process.stdout.write('.');
    }
    console.log(`  +${pageNewEvents} new events from page ${page} (total: ${events.length})`);

    if (pageNewEvents === 0) {
      noNewEventsCount++;
      if (noNewEventsCount >= 2) {
        console.log('  No new events for 2 pages, stopping');
        break;
      }
    } else {
      noNewEventsCount = 0;
    }
  }

  console.log(`\nTotal events scraped: ${events.length}`);
  return events;
}

if (require.main === module) {
  scrapeEvents()
    .then(events => {
      console.log(`\nScrape complete: ${events.length} events`);
      require('fs').writeFileSync('scraped-events-all.json', JSON.stringify(events, null, 2));
      if (events.length > 0) {
        console.log('Sample:', JSON.stringify(events[0], null, 2));
      }
    })
    .catch(console.error);
}
