import nodeFetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.av-event.jp';
const DELAY_MS = 2000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  await delay(DELAY_MS);
  const eventRes = await nodeFetch('https://www.av-event.jp/event/39424/', {
    headers: {
      'User-Agent': 'AV-Intelligence-Bot/1.0 (+https://av-intelligence.local)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en-US;q=0.9',
    }
  });
  const eventHtml = await eventRes.text();
  const $ = cheerio.load(eventHtml);
  
  // Test 1: Simple extraction without slots
  const actressEl = $('.p-event-info_detail-info--cast');
  console.log('actress cast count:', actressEl.length);
  console.log('first actress:', actressEl.first().text().trim());
  
  const titleEl = $('h1.m-ttl-event_tx');
  console.log('title:', titleEl.text().trim());
  
  const openDateEl = $('.p-event-info_detail-info--open-date');
  console.log('open date:', openDateEl.first().text().trim());
  
  const heldInfo = $('.p-event-info_held-info');
  console.log('\n.p-event-info_held-info count:', heldInfo.length);
  
  const heldList = $('.p-event-info_held-info-list');
  console.log('p-event-info_held-info-list count:', heldList.length);
  console.log('first list text:', heldList.first().text().replace(/\s+/g, ' ').trim().slice(0, 200));
  
  // Now test the each callback
  console.log('\nTesting each callback:');
  heldInfo.each((idx, el) => {
    console.log(`  slot ${idx}:`, typeof el, el.tagName);
    const slot$ = cheerio.load(el);
    console.log(`  slot$ type:`, typeof slot$);
    console.log(`  slot text:`, slot$('.p-event-info_held-info-list').text().replace(/\s+/g, ' ').trim().slice(0, 100));
  });
  
  // Test: what if we use $ directly in each
  console.log('\nTesting $ directly in each:');
  heldInfo.each((idx, el) => {
    const t = $(el).find('.p-event-info_held-info-list').text().replace(/\s+/g, ' ').trim().slice(0, 100);
    console.log(`  slot ${idx}:`, t);
  });
}

main().catch(console.error);
