import { fetchSaibunkanPhotobooks } from '../lib/photobooks/saibunkan';
import { ensurePhotobookTables, upsertPhotobookCandidates } from '../lib/photobooks/store';

// 彩文館官網女優寫真集 ingest：dry-run 預設，--all 全抓，--execute 先寫 Neon。
// Usage:
//   npx tsx scripts/ingest-saibunkan.ts            # 小批量 5 本驗證
//   npx tsx scripts/ingest-saibunkan.ts --all       # 全量 dry-run
//   npx tsx scripts/ingest-saibunkan.ts --all --execute
const limit = process.argv.includes('--all') ? undefined : 5;
const execute = process.argv.includes('--execute');

async function main() {
  const { items, errors } = await fetchSaibunkanPhotobooks({ limit });
  console.log(`彩文館掃描：${items.length} 本（limit=${limit ?? 'ALL'}，錯誤 ${errors.length}）\n`);
  for (const it of items) {
    console.log(
      `  ${it.actressName ?? '?'}《${it.bookTitle}》 ISBN ${it.isbn} ${it.releaseDate ?? ''} ¥${it.priceJpy ?? '?'} ${it.coverUrl ? '🖼' : '無圖'}`
    );
  }
  for (const e of errors) console.error('⚠', e.url, e.error);
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
