import { getSql } from '../lib/db';
import { translateJapaneseNews } from '../lib/news/translate';
import { fetchArticleBody } from '../lib/news/article';

// one-off: re-summarize specific ids by querying latest published source page.
const ids = process.argv.slice(2).map(Number).filter(Number.isFinite);
async function main() {
  const sql = getSql();
  for (const id of ids) {
    const rows = (await sql.query(
      `SELECT id,status,title_ja,summary_ja,source_url FROM news_items WHERE id=$1`,
      [id]
    )) as Array<{ id: number; status: string; title_ja: string; summary_ja: string | null; source_url: string }>;
    if (!rows.length) { console.log(`#${id} not found`); continue; }
    const r = rows[0];
    const article = await fetchArticleBody(r.source_url);
    const t = await translateJapaneseNews({ title: r.title_ja, summary: r.summary_ja, article });
    console.log(`#${id} body=${article.length}c zh=${(t.summaryZh||'').length}c`);
    console.log(t.summaryZh);
    await sql.query(
      `UPDATE news_items SET title_zh=$1, summary_zh=$2, translation_status='translated', updated_at=NOW() WHERE id=$3`,
      [t.titleZh, t.summaryZh, id]
    );
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
