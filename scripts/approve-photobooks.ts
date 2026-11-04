import { getSql } from '../lib/db';
// Approve upcoming/recent photobooks (>= cutoff) for the homepage new-release section.
// Dry-run unless --execute.
const execute = process.argv.includes('--execute');
const cutoff = process.argv.find((x) => x.startsWith('--from='))?.split('=')[1] || '2026-10-01';

async function main() {
  const rows = (await getSql().query(
    `SELECT isbn, actress_name, book_title, release_date, status
       FROM photobooks
      WHERE release_date >= $1
      ORDER BY release_date DESC`,
    [cutoff]
  )) as Array<Record<string, unknown>>;
  console.log(`符合 cutoff ${cutoff}: ${rows.length} 本`);
  for (const r of rows) console.log(`  ${r.release_date} ${r.actress_name}《${r.book_title}》[${r.status}]`);
  if (!execute) {
    console.log('\nDRY RUN。加 --execute 先設成 published。');
    return;
  }
  const upd = (await getSql().query(
    `UPDATE photobooks SET status='published', updated_at=NOW()
      WHERE release_date >= $1 AND status <> 'published'
      RETURNING isbn`,
    [cutoff]
  )) as Array<{ isbn: string }>;
  console.log(`\n已發布 ${upd.length} 本。`);
  const cnt = (await getSql().query(
    `SELECT status, COUNT(*)::int n FROM photobooks GROUP BY status ORDER BY 1`
  )) as Array<{ status: string; n: number }>;
  console.log(cnt);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
