/**
 * Database seeding script for AV Intelligence Hub
 * 
 * Usage: npx tsx scripts/seed.ts
 * 
 * Note: This script seeds the Neon database with sample data for development.
 * In production, data comes from the scrapers.
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function seed() {
  console.log('🌱 Starting database seeding...');
  console.log(`📍 Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  // Create tables
  console.log('\n📋 Creating tables...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS actresses (
      id TEXT PRIMARY KEY,
      name_ja TEXT NOT NULL,
      name_cn TEXT,
      avatar_url TEXT,
      bio TEXT,
      height TEXT,
      bust TEXT,
      waist TEXT,
      hip TEXT,
      birthday TEXT,
      debut_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      actress_id TEXT NOT NULL,
      title TEXT NOT NULL,
      venue TEXT,
      prefecture TEXT,
      datetime TEXT NOT NULL,
      event_type TEXT,
      url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actress_id) REFERENCES actresses(id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      actress_id TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      voted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(actress_id, ip_address)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS actress_events_count (
      actress_id TEXT PRIMARY KEY,
      year_2025_events INTEGER DEFAULT 0,
      year_2026_events INTEGER DEFAULT 0,
      month_04_2026_events INTEGER DEFAULT 0
    )
  `;

  console.log('✅ Tables created');

  // Sample actresses
  console.log('\n👩 Seeding actresses...');
  const sampleActresses = [
    { id: 'mine-001', name_ja: 'Mine Saori', name_cn: '美上雅典', height: '165', bust: '95', waist: '62', hip: '88' },
    { id: 'sora-001', name_ja: 'Sora Aoi', name_cn: '蒼井空', height: '158', bust: '86', waist: '60', hip: '86' },
    { id: 'yui-001', name_ja: 'Yui Hatano', name_cn: '波多野結衣', height: '162', bust: '86', waist: '58', hip: '85' },
    { id: 'tsuki-001', name_ja: 'Tsuki Lala', name_cn: '月 Lalafell', height: '160', bust: '88', waist: '60', hip: '87' },
  ];

  for (const actress of sampleActresses) {
    await sql`
      INSERT INTO actresses (id, name_ja, name_cn, height, bust, waist, hip)
      VALUES (${actress.id}, ${actress.name_ja}, ${actress.name_cn}, ${actress.height}, ${actress.bust}, ${actress.waist}, ${actress.hip})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ Inserted ${sampleActresses.length} actresses`);

  // Sample events
  console.log('\n📅 Seeding events...');
  const now = new Date();
  const sampleEvents = [
    { id: 'evt-001', actress_id: 'mine-001', title: 'Mine Saori Fan Meeting', venue: 'Tokyo Dome', prefecture: 'Tokyo', datetime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), event_type: '握手会' },
    { id: 'evt-002', actress_id: 'sora-001', title: 'Aoi Sora Birthday Event', venue: 'Osaka Hall', prefecture: 'Osaka', datetime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), event_type: '上映会' },
    { id: 'evt-003', actress_id: 'yui-001', title: 'Yui Hatano 2026 Calendar Signing', venue: 'Shibuya', prefecture: 'Tokyo', datetime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), event_type: 'サイン会' },
  ];

  for (const event of sampleEvents) {
    await sql`
      INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type)
      VALUES (${event.id}, ${event.actress_id}, ${event.title}, ${event.venue}, ${event.prefecture}, ${event.datetime}, ${event.event_type})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✅ Inserted ${sampleEvents.length} events`);

  // Get counts
  const actressCount = await sql`SELECT COUNT(*) as c FROM actresses`;
  const eventCount = await sql`SELECT COUNT(*) as c FROM events`;

  console.log('\n🎉 Database seeding complete!');
  console.log(`📊 Total actresses: ${(actressCount as any[])[0]?.c || 0}`);
  console.log(`📊 Total events: ${(eventCount as any[])[0]?.c || 0}`);
}

seed().catch(console.error);