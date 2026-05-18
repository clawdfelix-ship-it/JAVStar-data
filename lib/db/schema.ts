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
  birthday: string | null;           // 生年月日 e.g. "1997-12-24"
  age: number | null;               // 現在 ○歳
  zodiac: string | null;             // 星座 e.g. "やぎ座"
  agency: string | null;             // 所属事務所 e.g. "C-more Entertainment"
  hobby: string | null;              // 趣味・特技
  blog: string | null;               // ブログ
  official_site: string | null;      // 公式サイト
  tags: string | null;              // タグ (comma separated)
  debut_date: string | null;        // AV出演期間 - start year e.g. "2020"
  debut_work: string | null;         // デビュー作品 (full title)
  debut_year: number | null;         // 出道年份 (numeric, for calculations)
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

export interface NewRelease {
  id: string;
  video_code: string;           // 影片編號 e.g. VRKM-01790
  title: string;                // 標題
  cover_url: string | null;     // 封面
  detail_url: string | null;    // JavLibrary 詳情頁
  actresses: string | null;     // 女優名 (comma separated)
  release_date: string | null;  // 發行日期
  maker: string | null;         // 製作商
  created_at: string;
  updated_at: string;
}