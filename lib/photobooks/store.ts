import { getSql } from '@/lib/db';
import type { PhotobookCandidate } from './hanmoto';

// photobooks 取代舊 JavLibrary「每月新作」(new_releases)：AV 女優寫真集代購目錄。
// 3-state 同 news_items 一致：pending（ingest 預設）→ published（前台可見）／rejected。
// JCHING 只做目錄，唔站內收成人貨款；order_link 預設跳 Telegram。

export async function ensurePhotobookTables(): Promise<void> {
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS photobooks (
      isbn TEXT PRIMARY KEY,
      book_title TEXT NOT NULL,
      actress_name TEXT,
      photographer TEXT,
      publisher TEXT NOT NULL,
      title_raw TEXT NOT NULL,
      cover_url TEXT,
      source_url TEXT NOT NULL,
      release_date DATE,
      price_jpy INTEGER,
      order_note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_photobooks_status_release ON photobooks(status, release_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_photobooks_release ON photobooks(release_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_photobooks_publisher ON photobooks(publisher)',
  ];
  for (const stmt of indexes) await sql.query(stmt);
}

// Upsert 候選寫真集。只 INSERT pending、補更新 metadata，唔掂已審批 status（防 cron 覆核）。
export async function upsertPhotobookCandidates(
  items: PhotobookCandidate[]
): Promise<{ inserted: number; updated: number; sample: string[] }> {
  let inserted = 0;
  let updated = 0;
  const sample: string[] = [];
  for (const it of items) {
    const rows = (await getSql().query(
      `INSERT INTO photobooks
         (isbn, book_title, actress_name, photographer, publisher, title_raw,
          cover_url, source_url, release_date, price_jpy, status, raw_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11::jsonb)
       ON CONFLICT (isbn) DO UPDATE SET
         book_title = EXCLUDED.book_title,
         cover_url = COALESCE(EXCLUDED.cover_url, photobooks.cover_url),
         source_url = EXCLUDED.source_url,
         release_date = EXCLUDED.release_date,
         price_jpy = COALESCE(EXCLUDED.price_jpy, photobooks.price_jpy),
         title_raw = EXCLUDED.title_raw,
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [
        it.isbn,
        it.bookTitle,
        it.actressName,
        it.photographer,
        it.publisher,
        it.title,
        it.coverUrl,
        it.sourceUrl,
        it.releaseDate,
        (it as { priceJpy?: number | null }).priceJpy ?? null,
        JSON.stringify(it),
      ]
    )) as Array<{ inserted: boolean }>;
    if (rows[0]?.inserted) {
      inserted += 1;
      if (sample.length < 6) sample.push(`${it.actressName ?? ''}《${it.bookTitle}》`);
    } else {
      updated += 1;
    }
  }
  return { inserted, updated, sample };
}
