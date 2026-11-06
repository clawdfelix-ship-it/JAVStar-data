import { fetchHondanaPhotobooks, HONDANA_PUBLISHERS } from '../lib/photobooks/hondana';
import { ensurePhotobookTables, upsertPhotobookCandidates } from '../lib/photobooks/store';

// hondana 平台多社寫真集 ingest（竹書房/徳間/玄光社/白夜）。
// Usage:
//   npx tsx scripts/ingest-hondana.ts                 # 每社限 8 本 dry-run
//   npx tsx scripts/ingest-hondana.ts --all           # 全量 dry-run
//   npx tsx scripts/ingest-hondana.ts --all --execute
const all = process.argv.includes('--all');
const execute = process.argv.includes('--execute');

async function main() {
  const { items, errors } = await fetchHondanaPhotobooks({
    publishers: HONDANA_PUBLISHERS,
    limitPerPublisher: all ? undefined : 8,
  });
  console.log(`hondana 掃描：${items.length} 本寫真集（${HONDANA_PUBLISHERS.map((p) => p.publisher).join('/')}，錯誤 ${errors.length}）\n`);
  for (const it of items) {
    console.log(
      `  [${it.publisher}] ${it.actressName ?? '?'}《${it.bookTitle}》 ISBN ${it.isbn} ${it.releaseDate ?? ''} ¥${it.priceJpy ?? '?'} ${it.coverUrl ? '🖼' : '無圖'}`
    );
  }
  for (const e of errors) console.error('⚠', e.source, e.error);
  if (items.length === 0) return;

  if (!execute) {
    console.log('\nDRY RUN：冇寫入。加 --execute 先入 photobooks（status=pending）。');
    return;
  }
  await ensurePhotobookTables();
  const { inserted, updated, sample } = await upsertPhotobookCandidates(items);
  console.log(`\n已寫入：新增 ${inserted}，更新 metadata ${updated}（已存在項唔會改 status）`);
  for (const s of sample) console.log('  +', s);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
