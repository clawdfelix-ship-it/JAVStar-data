import { getSql } from '@/lib/db';
import type { NormalizedNewsItem } from './rss';

export type IngestNewsResult = {
  fetched: number;
  inserted: number;
  skipped: number;
  errors: Array<{ source: string; error: string }>;
  sampleTitles: string[];
};

export async function ensureNewsTables(): Promise<void> {
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS news_items (
      id BIGSERIAL PRIMARY KEY,
      source_key TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      canonical_url TEXT,
      title_ja TEXT NOT NULL,
      summary_ja TEXT,
      author TEXT,
      image_url TEXT,
      category TEXT NOT NULL DEFAULT 'news',
      is_adult BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'pending',
      translation_status TEXT NOT NULL DEFAULT 'not_translated',
      title_zh TEXT,
      summary_zh TEXT,
      raw_names JSONB NOT NULL DEFAULT '[]'::jsonb,
      match_confidence REAL NOT NULL DEFAULT 0,
      content_hash TEXT NOT NULL UNIQUE,
      raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      published_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_news_items_status_published ON news_items(status, published_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_news_items_source_published ON news_items(source_key, published_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_news_items_category_published ON news_items(category, published_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC)',
  ];
  for (const statement of indexes) await sql.query(statement);
}

export async function upsertPendingNewsItems(items: NormalizedNewsItem[]): Promise<{ inserted: number; skipped: number; sampleTitles: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const sampleTitles: string[] = [];

  for (const item of items) {
    // Neon serverless query() returns the rows array directly.
    const rows = (await getSql().query(
      `INSERT INTO news_items (
        source_key, source_name, source_url, canonical_url, title_ja, summary_ja,
        author, image_url, category, is_adult, status, translation_status,
        raw_names, match_confidence, content_hash, raw_json, published_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending','not_translated','[]'::jsonb,0,$11,$12::jsonb,$13)
       ON CONFLICT (source_url) DO UPDATE SET updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [
        item.sourceKey,
        item.sourceName,
        item.sourceUrl,
        item.canonicalUrl,
        item.titleJa,
        item.summaryJa,
        item.author,
        item.imageUrl,
        item.category,
        item.isAdult,
        item.contentHash,
        JSON.stringify(item.raw),
        item.publishedAt,
      ]
    )) as Array<{ inserted: boolean }>;

    if (rows[0]?.inserted) {
      inserted += 1;
      if (sampleTitles.length < 5) sampleTitles.push(item.titleJa);
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped, sampleTitles };
}
