import { chromium } from 'playwright';

async function testFANZA() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Try FANZA (former DMM adult)
    const urls = [
      'https://adult.dmm.co.jp/lite/actor/',
      'https://www.dmm.co.jp/live/',
      'https://chat.porn.com/actresses/events',
    ];
    
    for (const url of urls) {
      await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      console.log(`\n${url}:`);
      console.log('Title:', await page.title());
      console.log('URL:', page.url());
    }
  } catch(e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

testFANZA();
