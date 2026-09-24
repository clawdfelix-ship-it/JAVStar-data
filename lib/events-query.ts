export interface EventQueryOptions {
  prefecture: string | null;
  eventType: string | null;
  region: string | null;
  page: number;
  limit: number;
  requestedSortBy: string | null;
  requestedSortOrder: string | null;
  includePast: boolean;
}

export interface BuiltEventQueries {
  dataQuery: string;
  countQuery: string;
  dataParams: Array<string | number>;
  countParams: string[];
  safePage: number;
  safeLimit: number;
}

const REGION_CLAUSES: Record<string, string> = {
  japan: "prefecture IS NOT NULL AND prefecture != '' AND prefecture != '台北' AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'",
  taiwan: "prefecture = '台北'",
  hk: "prefecture LIKE '%香港%'",
  online: "prefecture = 'オンライン'",
};

export function buildEventQueries(options: EventQueryOptions): BuiltEventQueries {
  const safePage = Math.max(Number.isFinite(options.page) ? options.page : 1, 1);
  const safeLimit = Math.min(Math.max(Number.isFinite(options.limit) ? options.limit : 200, 1), 2000);
  const offset = (safePage - 1) * safeLimit;

  const allowedColumns: Record<string, string> = {
    datetime: 'e.date_iso',
    created_at: 'e.created_at',
    title: 'e.title',
  };
  const actualSortBy = options.requestedSortBy || 'datetime';
  const requestedSortOrder = options.requestedSortOrder === 'asc' ? 'ASC' : 'DESC';
  const actualSortOrder = actualSortBy === 'datetime' ? 'DESC' : requestedSortOrder;
  const sortCol = allowedColumns[actualSortBy] || 'e.date_iso';
  const sortDir = actualSortOrder === 'ASC' ? 'ASC' : 'DESC';
  const orderByClause = sortCol === 'e.date_iso'
    ? `e.date_iso ${sortDir} NULLS LAST, e.created_at DESC`
    : `${sortCol} ${sortDir} NULLS LAST`;

  const dataParts: string[] = ['e.date_iso IS NOT NULL'];
  const countParts: string[] = ['date_iso IS NOT NULL'];
  const dataParams: string[] = [];

  if (!options.includePast) {
    dataParts.push('e.date_iso >= CURRENT_DATE');
    countParts.push('date_iso >= CURRENT_DATE');
  }

  dataParts.push("e.actress_id IS NOT NULL AND e.actress_id != '0' AND e.actress_id != 'unknown'");
  countParts.push("actress_id IS NOT NULL AND actress_id != '0' AND actress_id != 'unknown'");

  if (options.prefecture) {
    dataParams.push(options.prefecture);
    dataParts.push(`e.prefecture = $${dataParams.length}`);
    countParts.push(`prefecture = $${dataParams.length}`);
  }

  if (options.eventType) {
    dataParams.push(options.eventType);
    dataParts.push(`e.event_type = $${dataParams.length}`);
    countParts.push(`event_type = $${dataParams.length}`);
  }

  if (options.region && options.region !== 'all' && REGION_CLAUSES[options.region]) {
    dataParts.push(REGION_CLAUSES[options.region]);
    countParts.push(REGION_CLAUSES[options.region]);
  }

  const whereClause = `WHERE ${dataParts.join(' AND ')}`;
  const countWhereClause = `WHERE ${countParts.join(' AND ')}`;
  const countParams = [...dataParams];

  const limitIdx = dataParams.push(safeLimit);
  const offsetIdx = dataParams.push(offset);

  const dataQuery = `
    SELECT e.*, a.name_ja, a.name_cn, a.avatar_url
    FROM events e
    LEFT JOIN actresses a ON e.actress_id = a.id
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM events
    ${countWhereClause}
  `;

  return {
    dataQuery,
    countQuery,
    dataParams,
    countParams,
    safePage,
    safeLimit,
  };
}
