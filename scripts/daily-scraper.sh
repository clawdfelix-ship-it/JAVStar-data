#!/bin/bash
# Daily scraper for AV Intelligence
# Morning run at 6:00 AM + Afternoon run at 3:00 PM via launchd
# Logs to logs/scraper-YYYYMMDD.log

PROJECT_DIR="/Users/chansiulungfelix/.openclaw/workspace-coding-qwen/JAVStar-data"
LOG_FILE="$PROJECT_DIR/logs/scraper-$(date +%Y%m%d).log"

mkdir -p "$PROJECT_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

run_scraper() {
  log "===== Scraper Run Started ($1) ====="
  cd "$PROJECT_DIR"
  # Load secrets from local .env (never commit credentials)
  if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    . "$PROJECT_DIR/.env"
    set +a
  fi
  if [ -z "$DATABASE_URL" ]; then
    log "ERROR: DATABASE_URL not set. Create $PROJECT_DIR/.env (see .env.example)."
    return 1
  fi
  log "Running scraper..."
  /opt/homebrew/bin/npx tsx scripts/daily-scraper.ts >> "$LOG_FILE" 2>&1
  log "===== Scraper Run Complete ($1) ====="
}

# Run scraper (called twice by launchd at different times, or manually)
run_scraper "$1"