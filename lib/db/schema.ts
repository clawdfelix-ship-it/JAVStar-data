// Schema types for AV Intelligence Hub
// Used with Neon Postgres via raw SQL

export interface Actress {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  bio: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  actress_id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
  created_at: string;
}

export interface Vote {
  id: string;
  actress_id: string;
  ip_address: string;
  voted_at: string;
}

export interface ActressEventsCount {
  actress_id: string;
  year_2025_events: number;
  year_2026_events: number;
}