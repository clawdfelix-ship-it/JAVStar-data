import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'av-intelligence.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS actresses (
    id TEXT PRIMARY KEY,
    name_ja TEXT NOT NULL,
    name_cn TEXT,
    birthday TEXT,
    height INTEGER,
    bust INTEGER,
    waist INTEGER,
    hip INTEGER,
    debut_date TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    actress_id TEXT NOT NULL,
    title TEXT NOT NULL,
    venue TEXT NOT NULL,
    prefecture TEXT,
    datetime TEXT NOT NULL,
    event_type TEXT,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actress_id) REFERENCES actresses(id)
  );

  CREATE TABLE IF NOT EXISTS actress_events_count (
    actress_id TEXT PRIMARY KEY,
    total_events INTEGER NOT NULL DEFAULT 0,
    year_2025_events INTEGER NOT NULL DEFAULT 0,
    year_2026_events INTEGER NOT NULL DEFAULT 0,
    month_04_2026_events INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (actress_id) REFERENCES actresses(id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime);
  CREATE INDEX IF NOT EXISTS idx_events_actress ON events(actress_id);

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actress_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    voted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actress_id) REFERENCES actresses(id),
    UNIQUE(actress_id, ip_address)
  );

  CREATE INDEX IF NOT EXISTS idx_votes_actress ON votes(actress_id);
  CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip_address);
`);

export { schema };