import { getSql } from '../lib/db';

// 批准「有真圖」嘅 pending 舊書出前台。
// hanmoto 封面 URL 路徑固定：預售時 404、出版後同一 URL 自動變 200，故 cover_url 唔清，前端 onError fallback。
// Dry-run 預設，--execute 先寫。
const execute = process.argv.includes('--execute');

async function main() {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT isbn, actress_name, book_title, release_date, cover_url, status
       FROM photobooks WHERE status='pending' ORDER BY release_date DESC`
  )) as Array<Record<string, any>>;

  const approveIsbns: string[] = [];
  for (const r of rows) {
    let good = false;
    if (r.cover_url) {
      try {
        const res = await fetch(r.cover_url);
        const buf = Buffer.from(await res.arrayBuffer());
        good = res.ok && buf.length > 2000 && /image\/jpeg|image\/png/.test(res.headers.get('content-type') || '');
      } catch {
        good = false;
      }
    }
    if (good) approveIsbns.push(r.isbn);
  }
  console.log(`pending ${rows.length} 本，有真圖可批准 ${approveIsbns.length} 本`);
  if (!execute) {
    console.log('DRY RUN。加 --execute 先設 published。ISBN:', approveIsbns.join(', '));
    return;
  }
  const upd = (await sql.query(
    `UPDATE photobooks SET status='published', updated_at=NOW() WHERE isbn = ANY($1) RETURNING isbn`,
    [approveIsbns]
  )) as Array<{ isbn: string }>;
  console.log(`已批准 ${upd.length} 本`);
  const cnt = (await sql.query(`SELECT status, COUNT(*)::int n FROM photobooks GROUP BY status ORDER BY 1`)) as any[];
  const cov = (await sql.query(
    `SELECT COUNT(*)::int total, COUNT(cover_url)::int with_url FROM photobooks WHERE status='published'`
  )) as any[];
  console.log('status:', cnt);
  console.log('published:', cov[0]);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
