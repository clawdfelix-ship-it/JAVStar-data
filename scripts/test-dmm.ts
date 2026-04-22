import { chromium } from 'playwright';

async function testDMM() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.context().addCookies([
      { name: 'age_check_done', value: '1', domain: '.dmm.co.jp', path: '/' },
      { name: 'cp_ab', value: '2', domain: '.dmm.co.jp', path: '/' }
    ]);
    
    await page.goto('https://www.dmm.co.jp/live/actor/', { timeout: 15000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('Title:', await page.title());
    console.log('URL:', page.url());
    
    const body = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Body text:', body);
  } catch(e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
}

testDMM();
