import cheerio from 'cheerio';
import fetch from 'node-fetch';

const BASE_URL = 'https://www.minnano-av.com';

async function test() {
  console.log('Fetching ranking page...');
  const response = await fetch(BASE_URL + '/ranking_actress.php', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  console.log('HTML length:', html.length);
  
  // Look for actress links
  const $ = cheerio.load(html);
  console.log('Page title:', $('title').text());
  
  // Check for various selectors
  console.log('\nChecking selectors:');
  console.log('a[href*="actress"] count:', $('a[href*="actress"]').length);
  console.log('a[href*="/actress"] count:', $('a[href*="/actress"]').length);
  
  // Show first few links
  console.log('\nFirst 5 actress links:');
  $('a[href*="actress"]').slice(0, 5).each((_, el) => {
    console.log(' -', $(el).attr('href'));
  });
  
  // Show some HTML structure
  console.log('\nBody snippet:', html.substring(0, 3000));
}

test().catch(console.error);