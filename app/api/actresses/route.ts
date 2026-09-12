import { getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/client-ip';
import { buildQueryVariants } from '@/lib/search-query';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// GET /api/actresses - List actresses with event counts + votes, sorted by weighted score
// Uses pre-aggregated actress_events_count table + indexed lookups → 5x faster
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'final_score';
    const hasUpcoming = searchParams.get('has_upcoming') === '1';
    const offset = (page - 1) * limit;

    // ---------- mode=quick：typeahead 專用輕量查詢 ----------
    // 不 JOIN votes、不做 COUNT、不計 final_score；只掃 actresses + 活動 count。
    // Phase 1（2026-09-10 搜尋藍圖）：前綴匹配權重行先。
    if (searchParams.get('mode') === 'quick') {
      const kw = search.trim();
      const cjk = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(kw);
      if (!kw || kw.length < (cjk ? 1 : 2)) {
        return NextResponse.json({ data: [], total: 0 });
      }
      const sqlQuick = getSql();
      // Phase 2：查詢變體（羅馬字/假名/日華異體）× trigram search_text/search_norm
      const variants = buildQueryVariants(kw).slice(0, 8);
      const whereSql: string[] = [];
      const params: string[] = [];
      for (const v of variants) {
        const likeIdx = params.length + 1;
        params.push(`%${v}%`);
        whereSql.push(`(a.search_text ILIKE $${likeIdx} OR a.search_norm ILIKE $${likeIdx})`);
      }
      // 尾參數：前綴（原名優先）、similarity 原值
      const prefixIdx = params.length + 1;
      const simIdx = params.length + 2;
      params.push(`${variants[0]}%`, variants[0]);
      const rows = await sqlQuick.query(
        `SELECT a.id, a.name_ja, a.name_cn, a.avatar_url,
                COALESCE(ec.year_2026_events, 0)::int AS year_2026_events
           FROM actresses a
           LEFT JOIN actress_events_count ec ON ec.actress_id = a.id
          WHERE ${whereSql.join(' OR ')}
          ORDER BY
            CASE WHEN a.name_ja ILIKE $${prefixIdx} THEN 0 ELSE 1 END,
            GREATEST(COALESCE(similarity(a.search_text, $${simIdx}), 0),
                     COALESCE(similarity(a.search_norm, $${simIdx}), 0)) DESC,
            COALESCE(ec.year_2026_events, 0) DESC,
            a.name_ja ASC
          LIMIT 9`,
        params
      ) as any[];
      const dur = Date.now() - startTime;
      const res = NextResponse.json({ data: rows, total: rows.length, quick: true, queryTimeMs: dur });
      // typeahead 關鍵字短暫快取，擋熱詞重複掃表
      res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
      return res;
    }


    // Sort whitelist（votes = 今月の人気；votes_all = 累計人気）
    const sortMap: Record<string, { col: string; dir: string }> = {
      debut_year:  { col: 'debut_year',       dir: 'DESC' },
      votes:       { col: 'vote_count',        dir: 'DESC' },
      votes_all:   { col: 'vote_count_all',    dir: 'DESC' },
      event_count: { col: 'year_2026_events',  dir: 'DESC' },
      year_2026_events: { col: 'year_2026_events', dir: 'DESC' },
      age:         { col: 'age',              dir: 'DESC' },
      name_ja:     { col: 'name_ja',           dir: 'ASC'  },
      upcoming:    { col: 'next_event_date',   dir: 'ASC'  },
      // 香港活動排序喺 ORDER BY 特殊處理（用 hk LATERAL，見下）
      hk_upcoming:  { col: 'next_hk_event_date', dir: 'ASC' },
    };
    const sort = sortMap[sortBy] ?? null;

    const sql = getSql();

    // 分頁/輸入收緊：limit 設上限，避免傳入超大值拖垮查詢
    const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 100);
    const safeOffset = Math.max(Number.isFinite(offset) ? offset : 0, 0);

    // WHERE conditions（全部用參數佔位，杜絕字串拼接注入）
    const whereParts: string[] = [];
    const params: any[] = [];
    if (search.trim()) {
      // Phase 2：行 search_text/search_norm（trigram），查詢變體覆蓋羅馬字/假名/簡繁日異體
      const variants = buildQueryVariants(search.trim()).slice(0, 8);
      const conds = variants.map((v) => {
        const idx = params.length + 1;
        params.push(`%${v}%`);
        return `(a.search_text ILIKE $${idx} OR a.search_norm ILIKE $${idx})`;
      });
      whereParts.push(`(${conds.join(' OR ')})`);
    }
    if (hasUpcoming) {
      whereParts.push(`ne.date_iso IS NOT NULL`);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // ORDER BY —— 列名/方向全部來自上方硬編碼 sortMap 白名單，唔接受用戶輸入
    // 綜合評分用「本月票數」(v_m)，每月歸零重計、貼近近期人氣
    const scoreExpr = '(COALESCE(ec.year_2026_events, 0) * 0.7 + COALESCE(v_m.cnt, 0) * 0.3)';
    const orderByClause = sortBy === 'upcoming'
      ? `ne.date_iso ASC NULLS LAST, ${scoreExpr} DESC`
      : sortBy === 'hk_upcoming'
        // 有香港活動嘅女優按最近檔期升序（最近→最遠），冇香港活動墊後再以綜合分排
        ? `hk.date_iso ASC NULLS LAST, ${scoreExpr} DESC`
        : sort
          ? `${sort.col} ${sort.dir} NULLS LAST`
          : `${scoreExpr} DESC`;

    // 下場活動喺 SQL 入面用 date_iso >= CURRENT_DATE 比較，唔再需要傳日期參數
    const dateIdx = params.length;

    // Main query — uses pre-aggregated actress_events_count + indexed votes lookup
    // LIMIT/OFFSET 用佔位符（$n），數值由上面收緊過
    params.push(safeLimit, safeOffset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const query = `
      SELECT
        a.id, a.name_ja, a.name_cn, a.avatar_url,
        a.age, a.zodiac, a.cup, a.height,
        a.bust, a.waist, a.hip, a.agency, a.hobby,
        a.debut_year, a.debut_date, a.debut_work,
        a.blog, a.official_site, a.tags,
        COALESCE(ec.year_2026_events, 0)::int AS year_2026_events,
        COALESCE(ec.year_2025_events, 0)::int AS year_2025_events,
        (COALESCE(ec.year_2025_events, 0) + COALESCE(ec.year_2026_events, 0))::int AS event_count,
        COALESCE(v_m.cnt, 0)::int             AS vote_count,
        COALESCE(v.cnt, 0)::int               AS vote_count_all,
        TO_CHAR(ne.date_iso, 'YYYY-MM-DD')    AS next_event_date,
        ne.title                              AS next_event_title,
        TO_CHAR(hk.date_iso, 'YYYY-MM-DD')    AS next_hk_event_date,
        hk.title                              AS next_hk_event_title,
        (COALESCE(ec.year_2026_events, 0) * 0.7 + COALESCE(v_m.cnt, 0) * 0.3) AS final_score
      FROM actresses a
      LEFT JOIN actress_events_count ec ON ec.actress_id = a.id
      LEFT JOIN LATERAL (
        -- 累計票數（總榜）
        SELECT COUNT(*) AS cnt FROM votes WHERE votes.actress_id = a.id
      ) v ON true
      LEFT JOIN LATERAL (
        -- 本月票數（今月の人気；vote_month 以香港時區計）
        SELECT COUNT(*) AS cnt FROM votes
         WHERE votes.actress_id = a.id
           AND votes.vote_month = to_char(now() AT TIME ZONE 'Asia/Hong_Kong', 'YYYY-MM')
      ) v_m ON true
      LEFT JOIN LATERAL (
        -- Next upcoming event: compare on normalized date_iso (raw datetime
        -- text has full-width digits that mis-sort/mis-compare).
        SELECT date_iso, title FROM events
        WHERE events.actress_id = a.id
          AND events.date_iso IS NOT NULL
          AND events.date_iso >= CURRENT_DATE
        ORDER BY events.date_iso ASC LIMIT 1
      ) ne ON true
      LEFT JOIN LATERAL (
        -- 下一場香港活動（2026-09-12 女優排名預設排序用）
        SELECT date_iso, title FROM events
        WHERE events.actress_id = a.id
          AND events.date_iso IS NOT NULL
          AND events.date_iso >= CURRENT_DATE
          AND (events.prefecture = '香港' OR events.venue LIKE '%香港%')
        ORDER BY events.date_iso ASC LIMIT 1
      ) hk ON true
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    // Count query — same WHERE（日期參數同主查詢共用同一個 $dateIdx 之前嘅參數）
    const countParams = params.slice(0, dateIdx); // search 參數 + 日期參數
    const countQuery = `
      SELECT COUNT(*)::int as cnt FROM actresses a
      LEFT JOIN LATERAL (
        SELECT date_iso FROM events
        WHERE events.actress_id = a.id
          AND events.date_iso IS NOT NULL
          AND events.date_iso >= CURRENT_DATE
        ORDER BY events.date_iso ASC LIMIT 1
      ) ne ON true
      ${whereClause}
    `;
    const countRows = await sql.query(countQuery, countParams);
    const total = (countRows as any)[0].cnt;

    const rows = await sql.query(query, params) as any[];

    // 批次查「我今個月投過邊啲女優」——一次 query 搞掂，取代每張卡各自打 vote API（舊 N+1：24 卡 = 24 request / 48 query）
    const ip = getClientIp(request);
    const pageIds = rows.map((r: any) => r.id);
    let myVoted = new Set<string>();
    if (pageIds.length) {
      const myVotes = await sql.query(
        `SELECT DISTINCT actress_id FROM votes
          WHERE ip_address = $1
            AND vote_month = to_char(now() AT TIME ZONE 'Asia/Hong_Kong', 'YYYY-MM')
            AND actress_id = ANY($2)`,
        [ip, pageIds]
      ) as any[];
      myVoted = new Set(myVotes.map(r => r.actress_id));
    }
    for (const r of rows) r.my_voted = myVoted.has(r.id);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      data: rows,
      pagination: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
      queryTimeMs: duration,
    });

  } catch (error) {
    console.error('Error fetching actresses:', error);
    return NextResponse.json({ error: 'Failed to fetch actresses', detail: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id, name_ja, name_cn, avatar_url, bio, height, bust, waist, hip } = body;
    if (!id || !name_ja) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const sql = getSql();
    await sql`
      INSERT INTO actresses (id, name_ja, name_cn, avatar_url, bio, height, bust, waist, hip)
      VALUES (${id}, ${name_ja}, ${name_cn}, ${avatar_url}, ${bio}, ${height}, ${bust}, ${waist}, ${hip})
    `;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating actress:', error);
    return NextResponse.json({ error: 'Failed to create actress' }, { status: 500 });
  }
}