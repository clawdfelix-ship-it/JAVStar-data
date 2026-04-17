import sql from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/setup - Initialize database tables
export async function GET() {
  try {
    // Create actresses table
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

    // Create events table
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

    // Create votes table
    await sql`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        actress_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        voted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(actress_id, ip_address)
      )
    `;

    return NextResponse.json({
      success: true,
      message: '✅ Tables created successfully!',
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create tables',
      details: String(error),
    }, { status: 500 });
  }
}