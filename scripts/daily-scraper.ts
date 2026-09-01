/**
 * AV Intelligence - Daily Scraper
 * 每天早上6點自動運行：
 * 1. 爬 av-event.jp 新活動 → 直接更新數據庫
 * 2. 爬 minnano-av.com 新女優 → 直接更新數據庫
 * 3. 自動觸發 Vercel deploy
 */

try { process.loadEnvFile(); } catch {}

import { chromium, Page } from 'playwright';
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

const sql = neon(process.env.DATABASE_URL!);

// ===== av-event.jp scraper =====
interface ScrapedEvent {
  id: string;
  actress_id: string;
  actress_name: string;
  event_name: string;
  event_date: string;
  event_type: string;
  location: string;
  description: string;
  url: string;
}

async function scrapePage(page: Page, pageNum: number, dateRange: string): Promise<ScrapedEvent[]> {
  const url = pageNum === 1
    ? `https://www.av-event.jp/search/?${dateRange}`
    : `https://www.av-event.jp/search/${pageNum}/?${dateRange}`;

  await page.goto(url);
  await page.waitForTimeout(3000);

  return await page.evaluate(() => {
    const events: ScrapedEvent[] = [];
    const items = document.querySelectorAll('li.c-event-list_item');
    
    items.forEach(item => {
      const titleLink = item.querySelector('a.c-event-item_title-link');
      if (!titleLink) return;
      
      const href = titleLink.getAttribute('href') || '';
      const idMatch = href.match(/\/event\/(\d+)\//);
      const id = idMatch ? idMatch[1] : '';
      const name = titleLink.textContent?.trim() || '';
      
      let location = '';
      let eventDate = '';
      
      // NEW av-event format (2026): dt = label, dd = value — dd uses class `c-event-item_detail-value`
      const dts = item.querySelectorAll('dt.c-event-item_detail-term');
      const dds = item.querySelectorAll('dd');
      
      for (let i = 0; i < dts.length; i++) {
        const dtText = dts[i].textContent || '';
        const dd = dds[i];
        if (!dd) continue;
        const ddText = dd.textContent?.trim() || '';
        
        if (dtText.includes('開催場所')) {
          location = ddText;
        } else if (dtText.includes('開催日') || dtText.includes('開催日時')) {
          // match both "開催日" and "開催日時" (changed site label)
          eventDate = ddText;
        }
      }
      
      if (id) {
        events.push({
          id,
          actress_id: '',
          actress_name: '',
          event_name: name,
          event_date: eventDate,
          event_type: '',
          location,
          description: '',
          url: 'https://www.av-event.jp' + href,
        });
      }
    });
    
    return events;
  });
}

async function scrapeEvents(): Promise<number> {
  console.log('[EVENTS] Starting av-event.jp scraper...');

  // av-event.jp caps pagination at 5 pages (100 items) per query — if we ask
  // for a whole year we only get the first 100 (usually most recent registrations,
  // NOT most recent event dates). Iterate month-by-month for the next 6 months
  // + past 2 months so each slice fits under the 5-page cap and we actually
  // reach July/August events.
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const before = await sql`SELECT COUNT(*) as cnt FROM events`;
  const beforeCount = Number(before[0].cnt);
  console.log(`[EVENTS] Events before: ${beforeCount}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const slices: Array<{ begin: string; end: string; label: string }> = [];
  for (let i = 0; i < 9; i++) {
    const s = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    const e = new Date(startMonth.getFullYear(), startMonth.getMonth() + i + 1, 0);
    slices.push({
      begin: fmt(s),
      end: fmt(e),
      label: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  let totalEvents = 0;
  // av-event.jp's pagination nav only ever renders ~5 page links (a sliding
  // window), so reading it to find the last page caps us at page 5 — months with
  // 300+ events (18 pages) silently lost everything past page 5. Instead, page
  // forward until a page returns zero events. Safety cap avoids an infinite loop
  // if the site ever returns items on an out-of-range URL.
  const MAX_PAGES_PER_SLICE = 60;
  for (const slice of slices) {
    const dateRange = `begin_date=${slice.begin}&end_date=${slice.end}`;
    console.log(`[EVENTS] Slice ${slice.label}: ${dateRange}`);

    let sliceCount = 0;
    let pagesCrawled = 0;
    for (let p = 1; p <= MAX_PAGES_PER_SLICE; p++) {
      const events = await scrapePage(page, p, dateRange);
      pagesCrawled = p;
      if (events.length === 0) break; // reached the last page for this slice
      sliceCount += events.length;
      for (const e of events) {
        try {
          const datetime = parseEventDate(e.event_date);
          // NOTE: events table has created_at (text) but NO updated_at column.
          // Previously this INSERT referenced updated_at → every row failed and the
          // empty catch swallowed it, so scraped events never reached the DB.
          await sql`
            INSERT INTO events (id, actress_id, title, datetime, prefecture, venue, event_type, url, created_at)
            VALUES (${e.id}, 'unknown', ${e.event_name}, ${datetime}, '', ${e.location}, ${e.event_type}, ${e.url}, NOW()::text)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              datetime = EXCLUDED.datetime,
              venue = EXCLUDED.venue,
              url = EXCLUDED.url
          `;
        } catch (insErr) {
          // Surface insert failures instead of silently dropping them.
          console.error(`[EVENTS] insert failed for id=${e.id}:`, insErr instanceof Error ? insErr.message : insErr);
        }
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    totalEvents += sliceCount;
    console.log(`[EVENTS] Slice ${slice.label}: ${sliceCount} events across ${pagesCrawled} page(s)`);
  }

  await browser.close();

  const after = await sql`SELECT COUNT(*) as cnt FROM events`;
  const afterCount = Number(after[0].cnt);
  const newEvents = afterCount - beforeCount;

  console.log(`[EVENTS] Scrape complete. Total scraped: ${totalEvents}, New in DB: ${newEvents}`);
  return newEvents;
}

// Freshly scraped events are inserted with actress_id='unknown'. The public API
// filters those out, so without this step new events never appear on the site.
// Relink by finding an actress name inside the event title; longest name wins to
// avoid short-name false positives.
//
// IMPORTANT: only match against CANONICAL actresses — numeric-id rows sourced
// from minnano-av. The DB also contains auto-generated placeholder rows
// (id LIKE 'auto_%', e.g. '周年記念', '大阪', 'オンライン') and 'unknown'/'0'
// placeholders. Matching against those links events to junk labels that then
// pollute the ranking and actress cards.
async function relinkUnknownEvents(): Promise<number> {
  const rows = await sql`
    UPDATE events e SET actress_id = sub.aid
    FROM (
      SELECT DISTINCT ON (ev.id) ev.id AS eid, n.aid
      FROM events ev
      CROSS JOIN LATERAL (
        SELECT a.id AS aid, length(a.name_ja) AS l FROM actresses a
          WHERE a.id ~ '^[0-9]+$' AND length(COALESCE(a.name_ja,'')) >= 2
            AND ev.title LIKE '%' || a.name_ja || '%'
        UNION ALL
        SELECT a.id, length(COALESCE(a.name_cn,'')) FROM actresses a
          WHERE a.id ~ '^[0-9]+$' AND length(COALESCE(a.name_cn,'')) >= 2
            AND ev.title LIKE '%' || a.name_cn || '%'
      ) n
      WHERE ev.actress_id IN ('unknown','0') OR ev.actress_id IS NULL
      ORDER BY ev.id, n.l DESC
    ) sub
    WHERE e.id = sub.eid
    RETURNING e.id
  `;
  const linked = (rows as unknown[]).length;
  console.log(`[EVENTS] Relinked ${linked} unknown events to canonical actresses`);
  return linked;
}

// Rebuild the pre-aggregated ranking table from real, canonical (numeric-id),
// valid-date events. The actresses list/ ranking reads actress_events_count,
// which otherwise goes stale after new events are linked.
async function rebuildEventCounts(): Promise<void> {
  await sql`
    INSERT INTO actress_events_count (actress_id, year_2025_events, year_2026_events, month_04_2026_events)
    SELECT actress_id,
      COUNT(*) FILTER (WHERE date_iso >= '2025-01-01' AND date_iso <  '2026-01-01')::int,
      COUNT(*) FILTER (WHERE date_iso >= '2026-01-01' AND date_iso <  '2027-01-01')::int,
      COUNT(*) FILTER (WHERE date_iso >= date_trunc('month', CURRENT_DATE)::date
                        AND date_iso <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)::int
    FROM events
    WHERE actress_id ~ '^[0-9]+$' AND date_iso IS NOT NULL
    GROUP BY actress_id
    ON CONFLICT (actress_id) DO UPDATE SET
      year_2025_events = EXCLUDED.year_2025_events,
      year_2026_events = EXCLUDED.year_2026_events,
      month_04_2026_events = EXCLUDED.month_04_2026_events
  `;
  console.log('[EVENTS] Rebuilt actress_events_count ranking table');
}

function parseEventDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Format: "2026年4月20日(日) 12:00" or "2026/04/20" etc.
  const match = dateStr.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}

// ===== Actress scraper (minnano-av.com) =====
async function scrapeActresses(): Promise<number> {
  console.log('[ACTRESSES] Starting minnano-av.com scraper...');
  
  // This is a simplified version - in production you'd want proper pagination
  // For now, just trigger the existing seed script
  console.log('[ACTRESSES] Actress scraping not fully implemented - using existing data');
  return 0;
}

// ===== Main =====
async function main() {
  console.log('[SCRAPER] ===== Daily Scraper Started =====');
  console.log(`[SCRAPER] Time: ${new Date().toISOString()}`);
  
  try {
    // 1. Scrape and update events
    const newEvents = await scrapeEvents();

    // 1b. Link newly scraped (unknown) events to their actresses by title, so the
    //     public API — which hides actress_id='unknown' rows — actually shows them.
    await relinkUnknownEvents();

    // 1c. Refresh the pre-aggregated ranking table so ranking/cards reflect new data.
    await rebuildEventCounts();
    
    // 2. Scrape and update actresses  
    const newActresses = await scrapeActresses();
    
    // 3. Summary
    console.log('\n[SCRAPER] ===== Summary =====');
    console.log(`[SCRAPER] New events: ${newEvents}`);
    console.log(`[SCRAPER] New actresses: ${newActresses}`);
    
    if (newEvents > 0 || newActresses > 0) {
      // Data is written straight to the Neon DB and Vercel reads it at runtime,
      // so no deploy is required. (Old code ran `git push` against a stale path
      // /Users/chansiulungfelix/Projects/av-intelligence which no longer exists.)
      console.log(`[SCRAPER] Data updated in DB (events +${newEvents}, actresses +${newActresses}). No redeploy needed.`);
    }
    
  } catch (err) {
    console.error('[SCRAPER] Error:', err);
  }
  
  console.log('[SCRAPER] ===== Daily Scraper Complete =====');
}

main().catch(console.error);
