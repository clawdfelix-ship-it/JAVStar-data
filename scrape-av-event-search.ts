/**
 * av-event.jp 活動爬蟲
 * 目標：爬取指定日期範圍內所有活動
 * 用法：npx tsx scrape-av-event-search.ts
 */
import { chromium } from 'playwright';
import * as fs from 'fs';

interface ScrapedEvent {
  id: string;
  actress_name: string;
  event_name: string;
  event_date: string;
  location: string;
  venue: string;
  event_type: string;
  url: string;
}

async function scrapeSearchPage(url: string): Promise<ScrapedEvent[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja,zh-TW;q=0.9' });
  
  const results: ScrapedEvent[] = [];
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // 測試不同 selector
    const eventItems = await page.locator('li.c-event-list_item').all();
    console.log(`Found ${eventItems.length} event items on page`);
    
    if (eventItems.length === 0) {
      // Fallback: try other selectors
      const altItems = await page.locator('.c-event-item, .event-item, [class*="event"]').all();
      console.log(`Fallback selector found ${altItems.length} items`);
    }
    
    for (const item of eventItems) {
      try {
        const titleEl = item.locator('a.c-event-item_title-link');
        const title = await titleEl.textContent().catch(() => '');
        const href = await titleEl.getAttribute('href').catch(() => '');
        
        const idMatch = href?.match(/\/event\/(\d+)\//);
        const id = idMatch ? idMatch[1] : '';
        
        // 提取 date 和 location
        const detailTexts = await item.locator('dt, dd').allTextContents().catch(() => []);
        
        let eventDate = '';
        let location = '';
        let venue = '';
        
        // av-event.jp detail format: dt= term, dd= value
        for (let i = 0; i < detailTexts.length; i += 2) {
          const term = detailTexts[i] || '';
          const value = detailTexts[i + 1] || '';
          if (term.includes('開催日') || term.includes('日程')) {
            eventDate = value.trim();
          } else if (term.includes('開催場所') || term.includes('会場')) {
            location = value.trim();
            venue = value.trim();
          }
        }
        
        if (!title || !id) continue;
        
        // 提取女優名（從標題）
        const actressMatch = title.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,20})(さん|ちゃん|san|chan)/i);
        const actressName = actressMatch ? actressMatch[1] : title.split(' ')[0].split('　')[0];
        
        results.push({
          id,
          actress_name: actressName,
          event_name: title.trim(),
          event_date: eventDate,
          location,
          venue,
          event_type: 'イベント',
          url: href?.startsWith('http') ? href : 'https://www.av-event.jp' + href,
        });
      } catch (e) {
        console.error('Error parsing item:', e);
      }
    }
    
    // 抓下一頁
    const nextBtn = page.locator('li.c-pagination_item a:has-text("次へ")');
    const nextHref = await nextBtn.getAttribute('href').catch(() => null);
    
    return { results, nextHref };
  } finally {
    await browser.close();
  }
}

async function main() {
  const beginDate = process.argv[2] || '20260528';
  const endDate = process.argv[3] || '20260831';
  
  const searchUrl = `https://www.av-event.jp/search/?begin_date=${beginDate}&end_date=${endDate}`;
  console.log(`🔍 Scraping: ${searchUrl}\n`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja,zh-TW;q=0.9' });
  await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Get total pages
  let totalPages = 1;
  try {
    const pageLinks = await page.locator('li.c-pagination_item a').allTextContents();
    console.log('Pagination links:', pageLinks);
    const lastPageLink = await page.locator('li.c-pagination_item a').last().getAttribute('href').catch(() => '');
    const pageMatch = lastPageLink?.match(/\/search\/(\d+)\//);
    if (pageMatch) totalPages = parseInt(pageMatch[1]);
    console.log(`Total pages: ${totalPages}`);
  } catch (e) {
    console.log('Pagination not found or 1 page only');
  }
  
  const allEvents: ScrapedEvent[] = [];
  
  for (let p = 1; p <= totalPages; p++) {
    const pageUrl = p === 1 ? searchUrl : `https://www.av-event.jp/search/${p}/?begin_date=${beginDate}&end_date=${endDate}`;
    console.log(`\n📄 Page ${p}/${totalPages}: ${pageUrl}`);
    
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const items = await page.locator('li.c-event-list_item').count();
    console.log(`  → ${items} events found`);
    
    const events = await page.evaluate(() => {
      const results: any[] = [];
      document.querySelectorAll('li.c-event-list_item').forEach(item => {
        const titleLink = item.querySelector('a.c-event-item_title-link');
        if (!titleLink) return;
        const href = titleLink.getAttribute('href') || '';
        const idMatch = href.match(/\/event\/(\d+)\//);
        const id = idMatch ? idMatch[1] : '';
        const title = titleLink.textContent?.trim() || '';
        
        // Get all dt/dd pairs
        const terms: string[] = [];
        const values: string[] = [];
        item.querySelectorAll('dt.c-event-item_detail-term').forEach(dt => terms.push(dt.textContent?.trim() || ''));
        item.querySelectorAll('dd.c-event-item_detail-link').forEach(dd => values.push(dd.textContent?.trim() || ''));
        
        let eventDate = '', location = '';
        for (let i = 0; i < terms.length; i++) {
          if (terms[i].includes('開催日')) eventDate = values[i] || '';
          if (terms[i].includes('開催場所')) location = values[i] || '';
        }
        
        results.push({ id, title, eventDate, location, href });
      });
      return results;
    });
    
    console.log(`  → Parsed ${events.length} events`);
    allEvents.push(...events.map((e: any) => ({
      id: e.id,
      actress_name: e.title.split(/[\s　]/)[0],
      event_name: e.title,
      event_date: e.eventDate,
      location: e.location,
      venue: e.location,
      event_type: 'イベント',
      url: e.href.startsWith('http') ? e.href : 'https://www.av-event.jp' + e.href,
    })));
    
    if (p < totalPages) await new Promise(r => setTimeout(r, 1500));
  }
  
  await browser.close();
  
  // Save
  fs.writeFileSync('scraped-events-search.json', JSON.stringify(allEvents, null, 2));
  console.log(`\n✅ Total scraped: ${allEvents.length} events`);
  
  // Stats
  const byDate = allEvents.reduce((acc: Record<string, number>, e) => {
    acc[e.event_date] = (acc[e.event_date] || 0) + 1;
    return acc;
  }, {});
  console.log('\nEvents by date:');
  Object.entries(byDate).slice(0, 10).forEach(([d, c]) => console.log(`  ${d}: ${c}`));
  
  if (allEvents.length > 0) {
    console.log('\nSample (first 3):');
    allEvents.slice(0, 3).forEach(e => console.log(JSON.stringify(e, null, 2)));
  }
}

interface ScrapeResult {
  results: ScrapedEvent[];
  nextHref: string | null;
}

main().catch(console.error);
