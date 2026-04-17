import * as cheerio from 'cheerio';
import nodeFetch from 'node-fetch';

const DELAY_MS = 2000;
async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await delay(2000);
  const r = await nodeFetch('https://www.av-event.jp/event/39424/', {
    headers: { 'User-Agent': 'AV-Intelligence-Bot/1.0', 'Accept': 'text/html', 'Accept-Language': 'ja' }
  });
  const html = await r.text();
  const $ = cheerio.load(html);

  // Actress: .notranslate inside .p-event-info_detail-info--cast
  const actress = $('.p-event-info_detail-info--cast .notranslate').first().text().trim();
  console.log('Actress:', actress);

  // Info text from first held-info slot
  const infoText = $('.p-event-info_held-info').first().find('.p-event-info_held-info-list').text().replace(/\s+/g, ' ').trim();
  console.log('Info text:', infoText.slice(0, 200));

  // Date match
  const dtMatch = infoText.match(/(\d{4}\/\d{1,2}\/\d{1,2}[^\d]*\d{1,2}:\d{2})/);
  console.log('Date match:', dtMatch ? dtMatch[1] : 'not found');

  // Venue match
  const venueMatch = infoText.match(/会場情報\s*(.+?)\s*住所/);
  console.log('Venue match:', venueMatch ? venueMatch[1] : 'not found');

  // Title
  const title = $('h1.m-ttl-event_tx').text().trim();
  console.log('Title:', title.slice(0, 60));
}

main().catch(console.error);
