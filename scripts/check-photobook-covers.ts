import { getSql } from '../lib/db';

// 逐本探 cover_url 係咪真圖（HTTP200 + image，非 noimage 占位），回報 pending 邊啲有封面。
async function main() {
  const rows = (await getSql().query(
    `SELECT isbn, actress_name, book_title, release_date, cover_url, status
       FROM photobooks WHERE status='pending' ORDER BY release_date DESC`
  )) as Array<Record<string, unknown>>;
  const withImg: unknown[] = [];
  const noImg: unknown[] = [];
  for (const r of rows) {
    const u = r.cover_url as string | null;
    let good = false;
    if (u) {
      try {
        const res = await fetch(u);
        const buf = Buffer.from(await res.arrayBuffer());
        good = res.ok && buf.length > 2000 && /image\/jpeg|image\/png/.test(res.headers.get('content-type') || '');
      } catch {
        good = false;
      }
    }
    (good ? withImg : noImg).push(`${r.release_date ? String(r.release_date).slice(0, 10) : ''} ${r.actress_name}《${r.book_title}》`);
  }
  console.log(`pending ${rows.length} 本：有真圖 ${withImg.length}，無圖 ${noImg.length}\n`);
  console.log('=== 有圖（可批准）===');
  (withImg as string[]).forEach((x) => console.log('  ', x));
  console.log('\n=== 無圖（保留 pending）===');
  (noImg as string[]).forEach((x) => console.log('  ', x));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
