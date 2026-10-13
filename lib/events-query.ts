type EventSortKey = 'datetime' | 'created_at' | 'title';

export type EventsQueryInput = {
  prefecture?: string | null;
  eventType?: string | null;
  organizer?: string | null;
  region?: string | null;
  includePast: boolean;
  limit: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
};

const TAIWAN_CITIES = ['台北', '新北', '高雄', '台中', '台南', '桃園', '基隆', '新竹', '嘉義', '屏東', '宜蘭', '花蓮', '台東'];
const twList = TAIWAN_CITIES.map((city) => `'${city}'`).join(', ');

const REGION_CLAUSES: Record<string, string> = {
  japan: `prefecture IS NOT NULL AND prefecture != '' AND prefecture NOT IN (${twList}) AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'`,
  taiwan: `prefecture IN (${twList})`,
  hk: "prefecture LIKE '%香港%'",
  online: "prefecture = 'オンライン'",
};

const SORT_COLUMNS: Record<EventSortKey, string> = {
  datetime: 'e.date_iso',
  created_at: 'e.created_at',
  title: 'e.title',
};

function normalizeSort(sortBy: string, sortOrder: 'ASC' | 'DESC') {
  const resolvedSortBy = (sortBy in SORT_COLUMNS ? sortBy : 'datetime') as EventSortKey;
  const resolvedSortOrder = resolvedSortBy === 'datetime' ? 'DESC' : sortOrder;
  const sortCol = SORT_COLUMNS[resolvedSortBy];
  const sortDir = resolvedSortOrder === 'ASC' ? 'ASC' : 'DESC';
  const orderByClause = sortCol === 'e.date_iso'
    ? `e.date_iso ${sortDir} NULLS LAST, e.created_at DESC`
    : `${sortCol} ${sortDir} NULLS LAST`;

  return { orderByClause };
}

export function buildEventsQueries(input: EventsQueryInput) {
  const params: string[] = [];
  const mainWhere: string[] = ['e.date_iso IS NOT NULL'];
  const countWhere: string[] = ['date_iso IS NOT NULL'];

  if (!input.includePast) {
    mainWhere.push('e.date_iso >= CURRENT_DATE');
    countWhere.push('date_iso >= CURRENT_DATE');
  }

  mainWhere.push("e.actress_id IS NOT NULL AND e.actress_id != '0' AND e.actress_id != 'unknown'");
  countWhere.push("actress_id IS NOT NULL AND actress_id != '0' AND actress_id != 'unknown'");

  if (input.prefecture) {
    params.push(input.prefecture);
    const idx = params.length;
    mainWhere.push(`e.prefecture = $${idx}`);
    countWhere.push(`prefecture = $${idx}`);
  }
  if (input.eventType) {
    params.push(input.eventType);
    const idx = params.length;
    mainWhere.push(`e.event_type = $${idx}`);
    countWhere.push(`event_type = $${idx}`);
  }
  if (input.organizer) {
    params.push(input.organizer);
    const idx = params.length;
    mainWhere.push(`e.organizer = $${idx}`);
    countWhere.push(`organizer = $${idx}`);
  }
  if (input.region && input.region !== 'all' && REGION_CLAUSES[input.region]) {
    mainWhere.push(`(${REGION_CLAUSES[input.region]})`);
    countWhere.push(`(${REGION_CLAUSES[input.region]})`);
  }

  const { orderByClause } = normalizeSort(input.sortBy, input.sortOrder);
  const whereClause = mainWhere.length ? `WHERE ${mainWhere.join(' AND ')}` : '';
  const countWhereClause = countWhere.length ? `WHERE ${countWhere.join(' AND ')}` : '';

  const queryParams = [...params, input.limit];
  const limitIdx = queryParams.length;

  return {
    fullQuery: `SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id ${whereClause} ORDER BY ${orderByClause} LIMIT $${limitIdx}`,
    countQuery: `SELECT COUNT(*) as total FROM events ${countWhereClause}`,
    queryParams,
    countParams: params,
  };
}
