#!/bin/bash
# Daily scraper for AV Intelligence
# Morning run at 6:00 AM + Afternoon run at 3:00 PM via launchd
# Logs to logs/scraper-YYYYMMDD.log

PROJECT_DIR="/Users/chansiulungfelix/Projects/av-intelligence"
LOG_FILE="$PROJECT_DIR/logs/scraper-$(date +%Y%m%d).log"

mkdir -p "$PROJECT_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

run_scraper() {
  log "===== Scraper Run Started ($1) ====="
  cd "$PROJECT_DIR"
  export DATABASE_URL='postgresql://neondb_owner:***REMOVED_SECRET***@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
  log "Running scraper..."
  /opt/homebrew/bin/npx tsx scripts/daily-scraper.ts >> "$LOG_FILE" 2>&1
  log "===== Scraper Run Complete ($1) ====="
}

# Run scraper (called twice by launchd at different times, or manually)
run_scraper "$1"