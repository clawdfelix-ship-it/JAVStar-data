#!/bin/bash
# jkface.net 台灣 AV 女優活動 爬取 + 入庫（2026-09-11）
# 經 launchd 每日跑（見 ~/Library/LaunchAgents/com.avintelligence.jkface.plist）
#
# camoufox 行 SPA UI（自訂時間 2026-08 起＋AV女優 tag＋無限滾動＋詳情頁）
# → JSON → tsx ingest（jkf- 前綴 id、繁中譯名→日文原名別名配對）

set -u

# launchd 預設 PATH 冇 homebrew（node/npx 喺 /opt/homebrew/bin）
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

PROJECT_DIR="/Users/chansiulungfelix/.openclaw/workspace-coding-qwen/JAVStar-data"
TODAY="$(date +%Y%m%d)"
LOG_FILE="$PROJECT_DIR/logs/jkface-$TODAY.log"
TMP_JSON="$PROJECT_DIR/logs/.jkface-$TODAY.json"

mkdir -p "$PROJECT_DIR/logs"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

cd "$PROJECT_DIR" || { echo "no project dir"; exit 1; }

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; . "$PROJECT_DIR/.env"; set +a
fi
if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL 未設定（$PROJECT_DIR/.env）"
  exit 1
fi

PY="$PROJECT_DIR/.venv-scrape/bin/python"
if [ ! -x "$PY" ]; then
  log "ERROR: 搵唔到 scrape venv：$PY"
  exit 1
fi

log "===== jkface Scrape Start ====="

# 1) 爬（stdout=輸出路徑，進度落 stderr）
if "$PY" "$PROJECT_DIR/scripts/scrape-jkface-camoufox.py" "$TMP_JSON" >>"$LOG_FILE" 2>&1; then
  log "scrape OK → $TMP_JSON"
else
  log "ERROR: camoufox 爬 jkface 失敗，今日唔入庫，保留舊數據"
  rm -f "$TMP_JSON"
  exit 1
fi

# 2) 入庫
if /opt/homebrew/bin/npx tsx "$PROJECT_DIR/scripts/ingest-jkface.ts" "$TMP_JSON" --apply >>"$LOG_FILE" 2>&1; then
  log "ingest OK"
else
  log "ERROR: ingest 入庫失敗（JSON 保留：$TMP_JSON）"
  exit 1
fi

rm -f "$TMP_JSON"
log "===== jkface Scrape Complete ====="
