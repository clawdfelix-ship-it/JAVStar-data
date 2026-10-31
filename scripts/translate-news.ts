import { getSql } from '../lib/db';
import { translateJapaneseNews } from '../lib/news/translate';
import { fetchArticleBody } from '../lib/news/article';

// Backfill/upgrade Chinese translations + longer summaries for news_items.
// Dry-run by default (prints sample). Add --execute to write.
// Usage: npx tsx scripts/translate-news.ts [--execute] [--limit=N] [--status=published] [--resummarize]
//   --resummarize  also re-process rows that already have title_zh (uses article body for longer summary)
const execute = process.argv.includes('--execute');
const resummarize = process.argv.includes('--resummarize');
const num = (flag: string, dflt: number) => {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? Number(a.split('=')[1]) : dflt;
};
const limit = num('limit', 30);
const statusArg = process.argv.find((x) => x.startsWith('--status='));
const status = statusArg ? statusArg.split('=')[1] : null; // pending | published | null(any)

async function main() {
  const sql = getSql();
  const conds: string[] = [];
  const params: unknown[] = [limit];
  if (resummarize) {
    conds.push("COALESCE(translation_status, 'not_translated') <> 'failed'");
  } else {
    conds.push("COALESCE(translation_status, 'not_translated') <> 'translated'");
    conds.push("COALESCE(title_zh, '') = ''");
  }
  if (status) {
    params.push(status);
    conds.push(`status = $${params.length}`);
  }
  const rows = (await sql.query(
    `SELECT id, status, title_ja, summary_ja, source_url
       FROM news_items
      WHERE ${conds.join(' AND ')}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $1`,
    params
  )) as Array<{
    id: number;
    status: string;
    title_ja: string;
    summary_ja: string | null;
    source_url: string;
  }>;

  console.log(
    `Candidates: ${rows.length} (status=${status ?? 'any'}, resummarize=${resummarize}, execute=${execute})`
  );
  if (!rows.length) return;

  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    try {
      const article = await fetchArticleBody(row.source_url);
      const t = await translateJapaneseNews({
        title: row.title_ja,
        summary: row.summary_ja,
        article,
      });
      ok += 1;
      const bodyLen = t.summaryZh ? t.summaryZh.length : 0;
      console.log(
        `\n#${row.id} [${row.status}] (bodySrc=${article.length}c, zhSummary=${bodyLen}c) ${row.title_ja}\n  -> ${t.titleZh}${t.summaryZh ? `\n     ${t.summaryZh}` : ''}`
      );
      if (execute) {
        await sql.query(
          `UPDATE news_items
              SET title_zh = $1, summary_zh = $2, translation_status = 'translated', updated_at = NOW()
            WHERE id = $3`,
          [t.titleZh, t.summaryZh, row.id]
        );
      }
    } catch (err) {
      fail += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n#${row.id} FAIL: ${msg}`);
      if (execute) {
        await sql.query(
          `UPDATE news_items SET translation_status = 'failed', updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
      }
    }
  }
  console.log(`\nTranslated OK=${ok} FAIL=${fail}`);
  if (!execute) console.log('DRY RUN: nothing written. Add --execute to persist.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
