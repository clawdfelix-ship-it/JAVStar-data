import { scrapeActresses } from './scrapers/minnano-list';

async function main() {
  console.log('=== Part 5: Offset 20000, Count 5000 ===');
  const results = await scrapeActresses(5000, 20000);
  console.log(`\n=== PART 5 COMPLETE: ${results.length} actresses ===`);
  const fs = require('fs');
  fs.writeFileSync('scraped-part5-full.json', JSON.stringify(results, null, 2));
  console.log('Saved to scraped-part5-full.json');
}

main().catch(console.error);
