#!/bin/bash
# 每月新作（JavLibrary new release）爬取 + 入庫
# 經 launchd 每日跑（見 ~/Library/LaunchAgents/com.avintelligence.new-releases.plist）
#
# 流程：camoufox 過 Cloudflare 爬 vl_newrelease.php（JSON 落暫存）→ tsx ingest 入 Neon
# 之所以分兩步：Cloudflare 要真瀏覽器（python/camoufox），入庫要 DATABASE_URL（node/tsx）。

set -u

PROJECT_DIR="/Users/chansiulungfelix/.openclaw/workspace-coding-qwen/JAVStar-data"
PAGES="${NEW_RELEASE_PAGES:-4}"   # 每日爬頭 4 頁（~80 件），足夠覆蓋一日新增
TODAY="$(date +%Y%m%d)"
LOG_FILE="$PROJECT_DIR/logs/new-releases-$TODAY.log"
TMP_JSON="$PROJECT_DIR/logs/.new-releases-$TODAY.json"

mkdir -p "$PROJECT_DIR/logs"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

cd "$PROJECT_DIR" || { echo "no project dir"; exit 1; }

# 載入 DATABASE_URL（.env 永不入 git）
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; . "$PROJECT_DIR/.env"; set +a
fi
if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL 未設定（$PROJECT_DIR/.env）"
  exit 1
fi

PY="$PROJECT_DIR/.venv-scrape/bin/python"
if [ ! -x "$PY" ]; then
  log "ERROR: 搵唔到 scrape venv：$PY（要先 camoufox fetch）"
  exit 1
fi

log "===== New Releases Scrape Start（$PAGES pages）====="

# 1) 爬（stdout=JSON，stderr/進度入 log）
if "$PY" "$PROJECT_DIR/scripts/scrape-new-releases-camoufox.py" "$PAGES" >"$TMP_JSON" 2>>"$LOG_FILE"; then
  log "scrape OK → $TMP_JSON"
else
  log "ERROR: camoufox scrape 失敗（可能 Cloudflare 擋/網絡），今日唔入庫，保留舊數據"
  rm -f "$TMP_JSON"
  exit 1
fi

# 2) 入庫
if /opt/homebrew/bin/npx tsx "$PROJECT_DIR/scripts/ingest-new-releases.ts" "$TMP_JSON" >>"$LOG_FILE" 2>&1; then
  log "ingest OK"
else
  log "ERROR: ingest 入庫失敗"
  rm -f "$TMP_JSON"
  exit 1
fi

rm -f "$TMP_JSON"
log "===== New Releases Scrape Complete ====="
