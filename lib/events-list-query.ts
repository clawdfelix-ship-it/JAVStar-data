type EventsListQueryOptions = {
  searchParams: URLSearchParams;
};

type EventsListQueryResult = {
  page: number;
  limit: number;
  offset: number;
  prefecture: string | null;
  eventType: string | null;
  organizer: string | null;
  fullQuery: string;
  fullParams: Array<string | number>;
  countQuery: string;
  countParams: string[];
};

const TAIWAN_CITIES = [
  '台北',
  '新北',
  '高雄',
  '台中',
  '台南',
  '桃園',
  '基隆',
  '新竹',
  '嘉義',
  '屏東',
  '宜蘭',
  '花蓮',
  '台東',
];

const twList = TAIWAN_CITIES.map((city) => `'${city}'`).join(', ');

const REGION_CLAUSES: Record<string, string> = {
  japan: `prefecture IS NOT NULL AND prefecture != '' AND prefecture NOT IN (${twList}) AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'`,
  taiwan: `prefecture IN (${twList})`,
  hk: "prefecture LIKE '%香港%'",
  online: "prefecture = 'オンライン'",
};

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function buildEventsListQueries(
  options: EventsListQueryOptions,
): EventsListQueryResult {
  const { searchParams } = options;
  const prefecture = searchParams.get('prefecture')?.trim() || null;
  const eventType = searchParams.get('type')?.trim() || null;
  const organizer = searchParams.get('organizer')?.trim() || null;
  const region = searchParams.get('region')?.trim() || null;
  const page = parsePositiveInt(searchParams.get('page'), 1, 100000);
  const limit = parsePositiveInt(searchParams.get('limit'), 200, 2000);
  const offset = (page - 1) * limit;
  const requestedSortBy = searchParams.get('sort') || 'datetime';
  const requestedSortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
  const includePast =
    searchParams.get('past') === '1' || searchParams.get('past') === 'true';

  const allowedColumns: Record<string, string> = {
    datetime: 'e.date_iso',
    created_at: 'e.created_at',
    title: 'e.title',
  };
  const sortCol = allowedColumns[requestedSortBy] || 'e.date_iso';
  const sortDir =
    sortCol === 'e.date_iso'
      ? 'DESC'
      : requestedSortOrder === 'ASC'
        ? 'ASC'
        : 'DESC';
  const orderByClause =
    sortCol === 'e.date_iso'
      ? `e.date_iso ${sortDir} NULLS LAST, e.created_at DESC`
      : `${sortCol} ${sortDir} NULLS LAST`;

  const fullParams: Array<string | number> = [];
  const fullWhereParts: string[] = [
    'e.date_iso IS NOT NULL',
    "e.actress_id IS NOT NULL AND e.actress_id != '0' AND e.actress_id != 'unknown'",
  ];
  if (!includePast) fullWhereParts.push('e.date_iso >= CURRENT_DATE');
  if (prefecture) {
    fullParams.push(prefecture);
    fullWhereParts.push(`e.prefecture = $${fullParams.length}`);
  }
  if (eventType) {
    fullParams.push(eventType);
    fullWhereParts.push(`e.event_type = $${fullParams.length}`);
  }
  if (organizer) {
    fullParams.push(organizer);
    fullWhereParts.push(`e.organizer = $${fullParams.length}`);
  }
  if (region && region !== 'all' && REGION_CLAUSES[region]) {
    fullWhereParts.push(REGION_CLAUSES[region].replaceAll('prefecture', 'e.prefecture'));
  }
  const fullWhereClause = `WHERE ${fullWhereParts.join(' AND ')}`;

  const countParams: string[] = [];
  const countWhereParts: string[] = [
    'date_iso IS NOT NULL',
    "actress_id IS NOT NULL AND actress_id != '0' AND actress_id != 'unknown'",
  ];
  if (!includePast) countWhereParts.push('date_iso >= CURRENT_DATE');
  if (prefecture) {
    countParams.push(prefecture);
    countWhereParts.push(`prefecture = $${countParams.length}`);
  }
  if (eventType) {
    countParams.push(eventType);
    countWhereParts.push(`event_type = $${countParams.length}`);
  }
  if (organizer) {
    countParams.push(organizer);
    countWhereParts.push(`organizer = $${countParams.length}`);
  }
  if (region && region !== 'all' && REGION_CLAUSES[region]) {
    countWhereParts.push(REGION_CLAUSES[region]);
  }
  const countWhereClause = `WHERE ${countWhereParts.join(' AND ')}`;

  fullParams.push(limit, offset);
  const limitPlaceholder = `$${fullParams.length - 1}`;
  const offsetPlaceholder = `$${fullParams.length}`;

  return {
    page,
    limit,
    offset,
    prefecture,
    eventType,
    organizer,
    fullQuery: `SELECT e.*, a.name_ja, a.name_cn, a.avatar_url
      FROM events e
      LEFT JOIN actresses a ON e.actress_id = a.id
      ${fullWhereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}`,
    fullParams,
    countQuery: `SELECT COUNT(*) as total FROM events ${countWhereClause}`,
    countParams,
  };
}
