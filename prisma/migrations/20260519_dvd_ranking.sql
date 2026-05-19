-- 建立 DVD排行榜 table
CREATE TABLE IF NOT EXISTS dvd_ranking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rank INTEGER NOT NULL,
  video_code TEXT NOT NULL,
  title TEXT,
  actress TEXT,
  maker TEXT,
  cover_url TEXT,
  detail_url TEXT,
  is_new BOOLEAN DEFAULT 0,
  rank_change TEXT DEFAULT 'same',
  source TEXT DEFAULT 'JavLibrary',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_dvd_ranking_rank ON dvd_ranking(rank);
CREATE INDEX IF NOT EXISTS idx_dvd_ranking_created ON dvd_ranking(created_at);
