/**
 * Scheduler for AV Intelligence scrapers
 * 
 * Run frequency:
 * - av-event scraper: every 1 hour
 * - minnano scraper: daily at 2:00 AM JST
 */

import cron from 'node-cron';
import { scrapeUpcomingEvents, scrapeActressEventCounts } from '../scrapers/av-event';
import { scrapeActressRanking, scrapeNewActresses } from '../scrapers/minnano';
import sql from '../lib/db';

// In-memory store for last scrape times
const lastScrape = {
  events: new Date(0),
  actresses: new Date(0),
};

// Rate limiting helper
let isRunning = false;

async function runWithLock(fn: () => Promise<void>, name: string) {
  if (isRunning) {
    console.log(`[${name}] Previous job still running, skipping`);
    return;
  }
  
  isRunning = true;
  console.log(`[${name}] Starting at ${new Date().toISOString()}`);
  
  try {
    await fn();
    console.log(`[${name}] Completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`[${name}] Failed:`, error);
  } finally {
    isRunning = false;
  }
}

// Scrape and store events
async function updateEvents() {
  const [scrapedEvents, eventCounts] = await Promise.all([
    scrapeUpcomingEvents(),
    scrapeActressEventCounts(),
  ]);

  // Resolve actress names to IDs (simple name matching)
  const actressList = await sql`SELECT id, name_ja FROM actresses`;
  const nameToId = new Map((actressList as any[]).map((a: any) => [a.name_ja, a.id]));

  // Insert/update events
  for (const event of scrapedEvents) {
    const actress_id = nameToId.get(event.actress_id) || event.actress_id;
    
    try {
      await sql`
        INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type, url)
        VALUES (${event.id}, ${actress_id}, ${event.title}, ${event.venue}, ${event.prefecture}, ${event.datetime}, ${event.event_type}, ${event.url})
        ON CONFLICT (id) DO UPDATE SET
          title = ${event.title},
          venue = ${event.venue},
          prefecture = ${event.prefecture},
          datetime = ${event.datetime},
          event_type = ${event.event_type}
      `;
    } catch (e) {
      // Ignore duplicate key errors
    }
  }

  lastScrape.events = new Date();
}

// Scrape and store actresses
async function updateActresses() {
  const scrapedActresses = await scrapeActressRanking();
  
  for (const actress of scrapedActresses) {
    try {
      await sql`
        INSERT INTO actresses (id, name_ja, name_cn, birthday, height, bust, waist, hip, debut_date, avatar_url, updated_at)
        VALUES (${actress.id}, ${actress.name_ja}, ${actress.name_cn}, ${actress.birthday}, ${actress.height}, ${actress.bust}, ${actress.waist}, ${actress.hip}, ${actress.debut_date}, ${actress.avatar_url}, ${new Date().toISOString()})
        ON CONFLICT (id) DO UPDATE SET
          name_ja = ${actress.name_ja},
          name_cn = ${actress.name_cn},
          birthday = ${actress.birthday},
          height = ${actress.height},
          bust = ${actress.bust},
          waist = ${actress.waist},
          hip = ${actress.hip},
          debut_date = ${actress.debut_date},
          avatar_url = ${actress.avatar_url},
          updated_at = ${new Date().toISOString()}
      `;
    } catch (e) {
      // Ignore
    }
  }

  // Also get new debuts
  const newActresses = await scrapeNewActresses();
  for (const actress of newActresses) {
    try {
      await sql`
        INSERT INTO actresses (id, name_ja, name_cn, birthday, height, bust, waist, hip, debut_date, avatar_url, updated_at)
        VALUES (${actress.id}, ${actress.name_ja}, ${actress.name_cn}, ${actress.birthday}, ${actress.height}, ${actress.bust}, ${actress.waist}, ${actress.hip}, ${actress.debut_date}, ${actress.avatar_url}, ${new Date().toISOString()})
        ON CONFLICT (id) DO UPDATE SET
          name_ja = ${actress.name_ja},
          name_cn = ${actress.name_cn},
          birthday = ${actress.birthday},
          height = ${actress.height},
          bust = ${actress.bust},
          waist = ${actress.waist},
          hip = ${actress.hip},
          debut_date = ${actress.debut_date},
          avatar_url = ${actress.avatar_url},
          updated_at = ${new Date().toISOString()}
      `;
    } catch (e) {
      // Ignore
    }
  }

  lastScrape.actresses = new Date();
}

// Start scheduler
export function startScheduler() {
  console.log('Starting AV Intelligence scheduler...');
  
  // Events scraper: every hour at minute 5
  cron.schedule('5 * * * *', () => {
    runWithLock(updateEvents, 'Events Scraper');
  });

  // Actress scraper: daily at 2:00 AM JST (17:00 UTC previous day)
  cron.schedule('0 17 * * *', () => {
    runWithLock(updateActresses, 'Actress Scraper');
  });

  console.log('Scheduler started');
  console.log('- Events: every hour at :05');
  console.log('- Actresses: daily at 02:00 JST');
}

// Manual trigger for testing
export async function triggerUpdate(type: 'events' | 'actresses' | 'all') {
  if (type === 'all') {
    await Promise.all([updateEvents(), updateActresses()]);
  } else if (type === 'events') {
    await updateEvents();
  } else {
    await updateActresses();
  }
}

// For Vercel/Serverless - export as serverless function
export default startScheduler;