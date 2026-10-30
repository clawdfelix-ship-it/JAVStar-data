import { fetchAllNewsSources } from '../lib/news/rss';
import { ensureNewsTables, upsertPendingNewsItems } from '../lib/news/ingest';

const execute = process.argv.includes('--execute');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

async function main() {
  const { items, errors } = await fetchAllNewsSources();
  const list = limit ? items.slice(0, limit) : items;

  console.log(`Fetched ${items.length} RSS items (using ${list.length})`);
  for (const error of errors) console.error(`SOURCE_FAIL ${error.source}: ${error.error}`);

  const bySource = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const item of list) {
    bySource.set(item.sourceName, (bySource.get(item.sourceName) || 0) + 1);
    byCategory.set(item.category, (byCategory.get(item.category) || 0) + 1);
  }
  console.log('By source:', Object.fromEntries(bySource));
  console.log('By category:', Object.fromEntries(byCategory));
  console.log('\nSample:');
  for (const item of list.slice(0, 12)) {
    console.log(`- [${item.sourceName}] ${item.publishedAt?.toISOString() ?? ''} [${item.category}] ${item.titleJa}`);
  }

  if (!execute) {
    console.log('\nDRY RUN: no rows written. Add --execute to upsert pending news_items.');
    return;
  }

  await ensureNewsTables();
  const result = await upsertPendingNewsItems(list);
  console.log(`\nInserted ${result.inserted}, skipped existing ${result.skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
