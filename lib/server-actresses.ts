import { getSql } from '@/lib/db';

// 女優排名列表查詢（server component 預取用，同 /api/actresses 嘅主查詢一致）。
// 只涵蓋首頁 SSR 需要嘅預設組合：sort=hk_upcoming、第一頁、無關鍵字。
export interface ServerActressRow {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  age: number | null;
  zodiac: string | null;
  cup: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  vote_count_all: number;
  final_score: number;
  next_event_date: string | null;
  next_event_title: string | null;
}

export async function fetchTopActressesForSSR(limit = 10): Promise<ServerActressRow[]> {
  const sql = getSql();
  const scoreExpr = '(COALESCE(ec.year_2026_events, 0) * 0.7 + COALESCE(v_m.cnt, 0) * 0.3)';
  const query = `
    SELECT
      a.id, a.name_ja, a.name_cn, a.avatar_url,
      a.age, a.zodiac, a.cup, a.height,
      a.bust, a.waist, a.hip, a.agency, a.hobby,
      a.debut_year,
      COALESCE(ec.year_2026_events, 0)::int AS year_2026_events,
      (COALESCE(ec.year_2025_events, 0) + COALESCE(ec.year_2026_events, 0))::int AS event_count,
      COALESCE(v_m.cnt, 0)::int AS vote_count,
      COALESCE(v.cnt, 0)::int   AS vote_count_all,
      TO_CHAR(ne.date_iso, 'YYYY-MM-DD') AS next_event_date,
      ne.title AS next_event_title,
      ${scoreExpr} AS final_score
    FROM actresses a
    LEFT JOIN actress_events_count ec ON ec.actress_id = a.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM votes WHERE votes.actress_id = a.id
    ) v ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM votes
       WHERE votes.actress_id = a.id
         AND votes.vote_month = to_char(now() AT TIME ZONE 'Asia/Hong_Kong', 'YYYY-MM')
    ) v_m ON true
    LEFT JOIN LATERAL (
      SELECT date_iso, title FROM events
      WHERE events.actress_id = a.id
        AND events.date_iso IS NOT NULL
        AND events.date_iso >= CURRENT_DATE
      ORDER BY events.date_iso ASC LIMIT 1
    ) ne ON true
    LEFT JOIN LATERAL (
      SELECT date_iso, title FROM events
      WHERE events.actress_id = a.id
        AND events.date_iso IS NOT NULL
        AND events.date_iso >= CURRENT_DATE
        AND (events.prefecture = '香港' OR events.venue LIKE '%香港%')
      ORDER BY events.date_iso ASC LIMIT 1
    ) hk ON true
    ORDER BY hk.date_iso ASC NULLS LAST, ${scoreExpr} DESC
    LIMIT $1
  `;
  return (await sql.query(query, [limit])) as unknown as ServerActressRow[];
}
