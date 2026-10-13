import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/setup - Initialize database tables
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

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

    // Create new_releases table for 每月新作
    await sql`
      CREATE TABLE IF NOT EXISTS new_releases (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        video_code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        cover_url TEXT,
        detail_url TEXT,
        actresses TEXT,
        release_date TEXT,
        maker TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create dvd_ranking table for 月間排行榜
    await sql`
      CREATE TABLE IF NOT EXISTS dvd_ranking (
        id SERIAL PRIMARY KEY,
        rank INTEGER NOT NULL,
        video_code TEXT NOT NULL,
        title TEXT,
        actress TEXT,
        maker TEXT,
        cover_url TEXT,
        detail_url TEXT,
        is_new BOOLEAN DEFAULT FALSE,
        rank_change TEXT DEFAULT 'same',
        source TEXT DEFAULT 'JavLibrary',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create actress_whitelist table for DMM Top 200 女優白名單
    await sql`
      CREATE TABLE IF NOT EXISTS actress_whitelist (
        id SERIAL PRIMARY KEY,
        rank INTEGER NOT NULL,
        actress_name TEXT NOT NULL,
        dmm_id TEXT,
        avatar_url TEXT,
        profile_url TEXT,
        source TEXT DEFAULT 'DMM Actress Ranking',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rank)
      )
    `;

    // 三平台整合 Phase 1：粉絲意圖/身份地基
    // fan_subscriptions = 「呢位女優有港台場時通知我」頂層漏斗捕獲
    await sql`
      CREATE TABLE IF NOT EXISTS fan_subscriptions (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        actress_id      TEXT NOT NULL,
        email           TEXT,
        tg_handle       TEXT,
        ig_handle       TEXT,
        identity_key    TEXT,
        channel_pref    TEXT NOT NULL DEFAULT 'tg',
        region_pref     TEXT NOT NULL DEFAULT 'hk',
        source          TEXT NOT NULL DEFAULT 'jching',
        fan_token       TEXT,
        ip_address      TEXT,
        status          TEXT NOT NULL DEFAULT 'active',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS fan_subs_identity_uq
      ON fan_subscriptions(actress_id, identity_key) WHERE identity_key IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS fan_subs_actress_idx ON fan_subscriptions(actress_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS fan_subs_token_idx   ON fan_subscriptions(fan_token)`;

    // fan_events = 跨平台行為日誌（jching/shopify/checkin/vvipbot/flashbids），
    // 初期用匿名 fan_token，轉換後可補 shopify_gid
    await sql`
      CREATE TABLE IF NOT EXISTS fan_events (
        id            BIGSERIAL PRIMARY KEY,
        fan_token     TEXT,
        shopify_gid   TEXT,
        source        TEXT NOT NULL,
        event_type    TEXT NOT NULL,
        actress_id    TEXT,
        event_id      TEXT,
        payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip_address    TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS fan_events_token_idx ON fan_events(fan_token, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS fan_events_gid_idx    ON fan_events(shopify_gid, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS fan_events_type_idx   ON fan_events(event_type, created_at DESC)`;

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