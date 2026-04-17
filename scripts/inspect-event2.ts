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
  const $e = cheerio.load(eventHtml);
  
  // Look at 開催情報 sections
  console.log('h2:');
  $e('h2').each((_, el) => {
    console.log('  "' + $e(el).text().trim() + '"');
    // Get sibling/parent context
    const parent = $e(el).parent();
    console.log('  Parent class:', parent.attr('class'));
  });
  
  // Try specific classes from the date output
  console.log('\n.element-classes:');
  $e('[class*="event-info"]').each((_, el) => {
    const cls = $e(el).attr('class');
    const text = $e(el).text().trim().replace(/\s+/g, ' ');
    console.log(`  ${cls}: "${text.slice(0, 100)}"`);
  });
  
  // Check for "開催情報" related elements
  console.log('\nAll classes in body:');
  const classes = new Set<string>();
  $e('[class]').each((_, el) => {
    const cls = $e(el).attr('class');
    if (cls) cls.split(' ').forEach(c => classes.add(c));
  });
  console.log([...classes].filter(c => c.includes('info') || c.includes('event') || c.includes('detail')).join('\n'));
  
  // Print full HTML of the main content area
  console.log('\n#main or .main or article:');
  const mainEl = $e('#main, .main, main, article, .content').first();
  console.log(mainEl.html()?.slice(0, 3000));
}

main().catch(console.error);
