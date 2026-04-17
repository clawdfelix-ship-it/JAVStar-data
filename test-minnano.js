const cheerio = require('cheerio');
const fetch = require('node-fetch');

const BASE_URL = 'https://www.minnano-av.com';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function exploreList() {
  console.log('=== Exploring Actress List Page ===\n');
  
  // First check the full actress list page
  const listUrl = BASE_URL + '/actress_list.html';
  console.log('Fetching:', listUrl);
  
  const response = await fetch(listUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
  });
  
  const html = await response.text();
  const doc = cheerio.load(html);
  
  console.log('Title:', doc('title').text());
  
  // Count total links to actress detail pages
  const actressLinks = [];
  doc('a[href*="actress"]').each((_, el) => {
    const href = doc(el).attr('href');
    if (href && /actress\d+\.html/.test(href)) {
      actressLinks.push(href);
    }
  });
  
  console.log('\nActress links found:', actressLinks.length);
  console.log('First 10:', actressLinks.slice(0, 10));
  
  // Check for pagination
  console.log('\n--- Looking for pagination ---');
  doc('[class*="pager"], [class*="pagination"], [class*="page"]').each((_, el) => {
    console.log('Pager element:', doc(el).text().substring(0, 200));
  });
  
  // Check for total count display
  const bodyText = doc('body').text();
  const countMatch = bodyText.match(/(\d+)\s*件|(\d+)\s*件|全\s*(\d+)|(\d+)\s*人品/);
  if (countMatch) {
    console.log('\nCount match:', countMatch[0]);
  }
  
  // Look for text patterns like "件" (items)
  const itemsMatch = bodyText.match(/(\d+,?\d*)\s*件の|i*\s*(\d+,?\d*)\s*/);
  if (itemsMatch) {
    console.log('Items:', itemsMatch[0]);
  }
  
  // Check for gojuon (alphabetical) navigation - we saw this earlier
  console.log('\n--- Gojuon Navigation ---');
  doc('a[href*="gojuon"]').each((_, el) => {
    const href = doc(el).attr('href');
    const text = doc(el).text();
    console.log(`  ${text}: ${href}`);
  });
}

exploreList().catch(console.error);