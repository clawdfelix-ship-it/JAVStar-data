const TAIWAN_CITIES = ['台北', '新北', '高雄', '台中', '台南', '桃園', '基隆', '新竹', '嘉義', '屏東', '宜蘭', '花蓮', '台東'];

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function quoteSqlLiteral(value: string): string {
  return `'${escapeSqlLiteral(value)}'`;
}

const twList = TAIWAN_CITIES.map(quoteSqlLiteral).join(', ');

const regionClauses: Record<string, string> = {
  japan: `prefecture IS NOT NULL AND prefecture != '' AND prefecture NOT IN (${twList}) AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'`,
  taiwan: `prefecture IN (${twList})`,
  hk: "prefecture LIKE '%香港%'",
  online: "prefecture = 'オンライン'",
};

export interface EventFilters {
  includePast: boolean;
  prefecture?: string | null;
  eventType?: string | null;
  organizer?: string | null;
  region?: string | null;
}

function buildFilterParts(prefix: string, filters: EventFilters): string[] {
  const parts: string[] = [`${prefix}date_iso IS NOT NULL`];

  if (!filters.includePast) parts.push(`${prefix}date_iso >= CURRENT_DATE`);

  parts.push(`${prefix}actress_id IS NOT NULL AND ${prefix}actress_id != '0' AND ${prefix}actress_id != 'unknown'`);

  if (filters.prefecture) parts.push(`${prefix}prefecture = ${quoteSqlLiteral(filters.prefecture)}`);
  if (filters.eventType) parts.push(`${prefix}event_type = ${quoteSqlLiteral(filters.eventType)}`);
  if (filters.organizer) parts.push(`${prefix}organizer = ${quoteSqlLiteral(filters.organizer)}`);
  if (filters.region && filters.region !== 'all' && regionClauses[filters.region]) {
    parts.push(regionClauses[filters.region]);
  }

  return parts;
}

export function buildEventsWhereClause(filters: EventFilters): string {
  return 'WHERE ' + buildFilterParts('e.', filters).join(' AND ');
}

export function buildEventsCountWhereClause(filters: EventFilters): string {
  return 'WHERE ' + buildFilterParts('', filters).join(' AND ');
}
