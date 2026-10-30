import { getSql } from '../lib/db';
import { fetchCoverImage } from '../lib/news/cover';

// Backfill news_items.image_url from each source page's og:image.
// Dry-run by default. Add --execute to persist. --status=published|pending|all (default all).
const execute = process.argv.includes('--execute');
const num = (flag: string, dflt: number) => {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? Number(a.split('=')[1]) : dflt;
};
const limit = num('limit', 100);
const statusArg = process.argv.find((x) => x.startsWith('--status='));
const status = statusArg ? statusArg.split('=')[1] : 'all';

async function main() {
  const sql = getSql();
  const where = [
    "COALESCE(image_url, '') = ''",
    ...(status === 'all' ? [] : ['status = $2']),
  ].join(' AND ');
  const params: unknown[] = [limit];
  if (status !== 'all') params.push(status);

  const rows = (await sql.query(
    `SELECT id, status, source_url
       FROM news_items
      WHERE ${where}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $1`,
    params
  )) as Array<{ id: number; status: string; source_url: string }>;

  console.log(`Cover backfill candidates: ${rows.length} (status=${status}, execute=${execute})`);
  let covered = 0;
  let failed = 0;
  for (const row of rows) {
    const cover = await fetchCoverImage(row.source_url);
    if (cover) {
      covered += 1;
      console.log(`#${row.id} [${row.status}] OK ${cover}`);
      if (execute) {
        await sql.query(
          `UPDATE news_items SET image_url = $1, updated_at = NOW() WHERE id = $2`,
          [cover, row.id]
        );
      }
    } else {
      failed += 1;
      console.log(`#${row.id} [${row.status}] -- no image`);
    }
  }
  console.log(`\ncovered=${covered} failed=${failed}`);
  if (!execute) console.log('DRY RUN: nothing written. Add --execute to persist.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
