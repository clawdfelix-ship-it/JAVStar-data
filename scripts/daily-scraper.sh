#!/bin/bash
# Daily scraper for AV Intelligence
# Runs at 6:00 AM via launchd
# Logs to logs/scraper-YYYYMMDD.log

PROJECT_DIR="/Users/chansiulungfelix/Projects/av-intelligence"
LOG_FILE="$PROJECT_DIR/logs/scraper-$(date +%Y%m%d).log"

mkdir -p "$PROJECT_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR"

log "===== Daily Scraper Started ====="

# Set database URL
export DATABASE_URL='postgresql://neondb_owner:npg_Wc2voTgpjM9h@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'

# Run the TypeScript scraper
log "Running scraper..."
/opt/homebrew/bin/npx tsx scripts/daily-scraper.ts >> "$LOG_FILE" 2>&1

log "===== Daily Scraper Complete ====="
