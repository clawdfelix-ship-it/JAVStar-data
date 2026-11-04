import { fetchAllPhotobooks } from '../lib/photobooks/hanmoto';
import { ensurePhotobookTables, upsertPhotobookCandidates } from '../lib/photobooks/store';

// hanmoto 女優寫真集 ingest：dry-run 預設，--execute 先寫 Neon。
// Usage: npx tsx scripts/ingest-photobooks.ts [--execute]
const execute = process.argv.includes('--execute');

async function main() {
  const { items, errors } = await fetchAllPhotobooks();
  console.log(`hanmoto 掃描：${items.length} 本 AV 女優寫真集（${errors.length} 社出錯）`);
  for (const it of items) {
    console.log(
      `  [${it.publisher}] ${it.actressName ?? '?'}《${it.bookTitle}》 ISBN ${it.isbn} ${it.releaseDate ?? ''} ${it.coverUrl ? '🖼' : '無圖'}`
    );
  }
  for (const e of errors) console.error(`  ⚠ ${e.publisher}: ${e.error}`);
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
