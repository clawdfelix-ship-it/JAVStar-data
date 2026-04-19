import { scrapeActresses } from './scrapers/minnano-list';
import * as fs from 'fs';

async function main() {
  console.log('=== Part 3 RESTART: Offset 10000, Count 5000 ===');
  const start = Date.now();
  const results = await scrapeActresses(5000, 10000);
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n=== PART 3 COMPLETE ===`);
  console.log(`Total: ${results.length} actresses`);
  console.log(`Time: ${elapsed}s (${Math.round(elapsed/60)}m)`);
  if (results.length > 0) {
    console.log(`First: ${results[0].name_ja} (${results[0].id})`);
    console.log(`Last: ${results[results.length-1].name_ja} (${results[results.length-1].id})`);
  }
  fs.writeFileSync('scraped-part3-full.json', JSON.stringify(results, null, 2));
  console.log('Saved to scraped-part3-full.json');
}

main().catch(e => { console.error(e); process.exit(1); });
