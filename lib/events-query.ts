export interface BuildEventsQueriesInput {
  prefecture: string | null;
  eventType: string | null;
  region: string | null;
  includePast: boolean;
  limit: number;
  offset: number;
  requestedSortBy: string | null;
  requestedSortOrder: string | null;
}

interface BuiltEventsQueries {
  eventQuery: string;
  eventParams: Array<string | number>;
  countQuery: string;
  countParams: Array<string | number>;
}

const REGION_SQL: Record<string, string> = {
  japan: "prefecture IS NOT NULL AND prefecture != '' AND prefecture != '台北' AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'",
  taiwan: "prefecture = '台北'",
  hk: "prefecture LIKE '%香港%'",
  online: "prefecture = 'オンライン'",
};

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  datetime: 'e.date_iso',
  created_at: 'e.created_at',
  title: 'e.title',
};

function pushParam(params: Array<string | number>, value: string | number): string {
  params.push(value);
  return `$${params.length}`;
}

function buildColumnName(alias: string | null, column: string): string {
  return alias ? `${alias}.${column}` : column;
}

function buildWhereClause(
  alias: string | null,
  input: Pick<BuildEventsQueriesInput, 'prefecture' | 'eventType' | 'region' | 'includePast'>,
  params: Array<string | number>,
): string {
  const parts: string[] = [buildColumnName(alias, 'date_iso') + ' IS NOT NULL'];

  if (!input.includePast) {
    parts.push(`${buildColumnName(alias, 'date_iso')} >= CURRENT_DATE`);
  }

  parts.push(
    `${buildColumnName(alias, 'actress_id')} IS NOT NULL`,
    `${buildColumnName(alias, 'actress_id')} != '0'`,
    `${buildColumnName(alias, 'actress_id')} != 'unknown'`,
  );

  if (input.prefecture) {
    parts.push(`${buildColumnName(alias, 'prefecture')} = ${pushParam(params, input.prefecture)}`);
  }

  if (input.eventType) {
    parts.push(`${buildColumnName(alias, 'event_type')} = ${pushParam(params, input.eventType)}`);
  }

  if (input.region && input.region !== 'all' && REGION_SQL[input.region]) {
    parts.push(REGION_SQL[input.region]);
  }

  return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
}

export function buildEventsQueries(input: BuildEventsQueriesInput): BuiltEventsQueries {
  const requestedSortBy = input.requestedSortBy || 'datetime';
  const requestedSortOrder = input.requestedSortOrder === 'ASC' ? 'ASC' : 'DESC';
  const actualSortOrder = requestedSortBy === 'datetime' ? 'DESC' : requestedSortOrder;
  const sortCol = ALLOWED_SORT_COLUMNS[requestedSortBy] || 'e.date_iso';
  const sortDir = actualSortOrder === 'ASC' ? 'ASC' : 'DESC';
  const orderByClause = sortCol === 'e.date_iso'
    ? `e.date_iso ${sortDir} NULLS LAST, e.created_at DESC`
    : `${sortCol} ${sortDir} NULLS LAST`;

  const eventParams: Array<string | number> = [];
  const eventWhereClause = buildWhereClause('e', input, eventParams);
  const limitToken = pushParam(eventParams, input.limit);
  const offsetToken = pushParam(eventParams, input.offset);

  const countParams: Array<string | number> = [];
  const countWhereClause = buildWhereClause(null, input, countParams);

  return {
    eventQuery:
      `SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e ` +
      `LEFT JOIN actresses a ON e.actress_id = a.id ${eventWhereClause} ` +
      `ORDER BY ${orderByClause} LIMIT ${limitToken} OFFSET ${offsetToken}`,
    eventParams,
    countQuery: `SELECT COUNT(*) as total FROM events ${countWhereClause}`,
    countParams,
  };
}
