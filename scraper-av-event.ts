import { chromium, Page } from 'playwright';
import * as fs from 'fs';

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

async function scrapePage(page: Page, pageNum: number): Promise<ScrapedEvent[]> {
  const url = pageNum === 1
    ? 'https://www.av-event.jp/search/?begin_date=20260101&end_date=20260630'
    : `https://www.av-event.jp/search/${pageNum}/?begin_date=20260101&end_date=20260630`;

  console.log(`Scraping page ${pageNum}: ${url}`);
  await page.goto(url); await page.waitForTimeout(3000);

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
      
      // Find location - it's in a <dd class="c-event-item_detail-link"> after a <dt> containing 開催場所
      let location = '';
      let eventDate = '';
      
      const dts = item.querySelectorAll('dt.c-event-item_detail-term');
      const dds = item.querySelectorAll('dd.c-event-item_detail-link');
      
      for (let i = 0; i < dts.length; i++) {
        const dtText = dts[i].textContent || '';
        const dd = dds[i];
        if (!dd) continue;
        const ddText = dd.textContent?.trim() || '';
        
        if (dtText.includes('開催場所')) {
          location = ddText;
        } else if (dtText.includes('開催日')) {
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const allEvents: ScrapedEvent[] = [];
  
  // First, get total pages
  await page.goto('https://www.av-event.jp/search/?begin_date=20260101&end_date=20260630'); await page.waitForTimeout(3000);
  const lastPage = await page.evaluate(() => {
    const links = document.querySelectorAll('li.c-pagination_item a');
    let maxPage = 1;
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/search\/(\d+)\//);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxPage) maxPage = num;
      }
    });
    return maxPage;
  });
  console.log(`Total pages: ${lastPage}`);
  
  // Scrape all pages
  for (let p = 1; p <= lastPage; p++) {
    const events = await scrapePage(page, p);
    allEvents.push(...events);
    console.log(`Page ${p}: got ${events.length} events (total: ${allEvents.length})`);
    if (p < lastPage) await new Promise(r => setTimeout(r, 2000));
  }
  
  await browser.close();
  
  fs.writeFileSync('scraped-events-search.json', JSON.stringify(allEvents, null, 2));
  console.log(`\nTotal scraped: ${allEvents.length} events`);
  
  // Show sample
  if (allEvents.length > 0) {
    console.log('\nSample event:');
    console.log(JSON.stringify(allEvents[0], null, 2));
  }
}

main().catch(console.error);
