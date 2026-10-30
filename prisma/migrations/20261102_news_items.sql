-- 女優情報聚合：只存標題、摘要、來源連結等索引資訊，不鏡像全文。
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
);

CREATE INDEX IF NOT EXISTS idx_news_items_status_published
  ON news_items(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_source_published
  ON news_items(source_key, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_category_published
  ON news_items(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at
  ON news_items(published_at DESC);
