-- 女優情報審批日誌：每次 approve/reject 都留痕，方便追查邊個/幾時改狀態。
CREATE TABLE IF NOT EXISTS news_moderation_log (
  id BIGSERIAL PRIMARY KEY,
  news_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_moderation_log_news_id
  ON news_moderation_log(news_id, created_at DESC);
