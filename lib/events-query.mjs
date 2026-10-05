const TAIWAN_CITIES = ['台北', '新北', '高雄', '台中', '台南', '桃園', '基隆', '新竹', '嘉義', '屏東', '宜蘭', '花蓮', '台東'];

export function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function quotedList(values) {
  return values.map((value) => `'${escapeSqlLiteral(value)}'`).join(', ');
}

function buildRegionClauses() {
  const taiwanCities = quotedList(TAIWAN_CITIES);
  return {
    japan: `prefecture IS NOT NULL AND prefecture != '' AND prefecture NOT IN (${taiwanCities}) AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'`,
    taiwan: `prefecture IN (${taiwanCities})`,
    hk: "prefecture LIKE '%香港%'",
    online: "prefecture = 'オンライン'",
  };
}

function buildWhereParts({ prefecture, eventType, organizer, region, includePast }) {
  const regionClauses = buildRegionClauses();
  const parts = ['e.date_iso IS NOT NULL'];

  if (!includePast) parts.push('e.date_iso >= CURRENT_DATE');
  parts.push("e.actress_id IS NOT NULL AND e.actress_id != '0' AND e.actress_id != 'unknown'");
  if (prefecture) parts.push(`e.prefecture = '${escapeSqlLiteral(prefecture)}'`);
  if (eventType) parts.push(`e.event_type = '${escapeSqlLiteral(eventType)}'`);
  if (organizer) parts.push(`e.organizer = '${escapeSqlLiteral(organizer)}'`);
  if (region && region !== 'all' && regionClauses[region]) {
    parts.push(regionClauses[region]);
  }

  return parts;
}

function buildCountWhereParts({ prefecture, eventType, organizer, region, includePast }) {
  const regionClauses = buildRegionClauses();
  const parts = ['date_iso IS NOT NULL'];

  if (!includePast) parts.push('date_iso >= CURRENT_DATE');
  parts.push("actress_id IS NOT NULL AND actress_id != '0' AND actress_id != 'unknown'");
  if (prefecture) parts.push(`prefecture = '${escapeSqlLiteral(prefecture)}'`);
  if (eventType) parts.push(`event_type = '${escapeSqlLiteral(eventType)}'`);
  if (organizer) parts.push(`organizer = '${escapeSqlLiteral(organizer)}'`);
  if (region && region !== 'all' && regionClauses[region]) {
    parts.push(regionClauses[region]);
  }

  return parts;
}

export function buildEventsQueries({
  prefecture,
  eventType,
  organizer,
  region,
  includePast,
  sortBy,
  sortOrder,
  limit,
  offset,
}) {
  const allowedColumns = {
    datetime: 'e.date_iso',
    created_at: 'e.created_at',
    title: 'e.title',
  };
  const sortCol = allowedColumns[sortBy] || 'e.date_iso';
  const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const orderByClause = sortCol === 'e.date_iso'
    ? `e.date_iso ${sortDir} NULLS LAST, e.created_at DESC`
    : `${sortCol} ${sortDir} NULLS LAST`;

  const whereClause = `WHERE ${buildWhereParts({ prefecture, eventType, organizer, region, includePast }).join(' AND ')}`;
  const countWhereClause = `WHERE ${buildCountWhereParts({ prefecture, eventType, organizer, region, includePast }).join(' AND ')}`;

  return {
    fullQuery: `SELECT e.*, a.name_ja, a.name_cn, a.avatar_url FROM events e LEFT JOIN actresses a ON e.actress_id = a.id ${whereClause} ORDER BY ${orderByClause} LIMIT ${limit} OFFSET ${offset}`,
    countQuery: `SELECT COUNT(*) as total FROM events ${countWhereClause}`,
  };
}
