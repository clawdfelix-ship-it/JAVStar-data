const cheerio = require('cheerio');
const fetch = require('node-fetch');

const BASE_URL = 'https://www.minnano-av.com';

async function test() {
  // Test second actress (大槻ひびき)
  const detailUrl = BASE_URL + '/actress14008.html';
  console.log('Fetching:', detailUrl);
  
  const response = await fetch(detailUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
  });
  
  const html = await response.text();
  const doc = cheerio.load(html);
  
  console.log('Title:', doc('title').text());
  
  // Show ALL tables
  console.log('\n--- Tables found:', doc('table').length, '---');
  doc('table').each((i, table) => {
    console.log(`\n=== Table ${i} (${doc(table).find('tr').length} rows) ===`);
    console.log(doc(table).html().substring(0, 1000));
  });
  
  // Also look for profile div
  console.log('\n--- Looking for profile div ---');
  console.log('actress-profile:', doc('[class*="actress-profile"]').length);
  console.log('profile:', doc('[class*="profile"]').length);
  console.log('act-area:', doc('[class*="act-area"]').length);
}

test().catch(console.error);