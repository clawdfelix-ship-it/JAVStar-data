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

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function checkToken(provided, expected) {
  if (!expected) return false;
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

function column(tableAlias, name) {
  return tableAlias ? `${tableAlias}.${name}` : name;
}

function buildRegionClause(tableAlias, region) {
  const prefectureCol = column(tableAlias, 'prefecture');
  const twList = TAIWAN_CITIES.map((city) => `'${city}'`).join(', ');

  const regionClauses = {
    japan: `${prefectureCol} IS NOT NULL AND ${prefectureCol} != '' AND ${prefectureCol} NOT IN (${twList}) AND ${prefectureCol} != 'オンライン' AND ${prefectureCol} NOT LIKE '%香港%'`,
    taiwan: `${prefectureCol} IN (${twList})`,
    hk: `${prefectureCol} LIKE '%香港%'`,
    online: `${prefectureCol} = 'オンライン'`,
  };

  return regionClauses[region] ?? null;
}

export function buildEventWhereClause({
  prefecture,
  eventType,
  organizer,
  region,
  includePast,
  tableAlias = '',
}) {
  const params = [];
  const parts = [
    `${column(tableAlias, 'date_iso')} IS NOT NULL`,
    `${column(tableAlias, 'actress_id')} IS NOT NULL AND ${column(tableAlias, 'actress_id')} != '0' AND ${column(tableAlias, 'actress_id')} != 'unknown'`,
  ];

  if (!includePast) {
    parts.splice(1, 0, `${column(tableAlias, 'date_iso')} >= CURRENT_DATE`);
  }

  if (prefecture) {
    params.push(prefecture);
    parts.push(`${column(tableAlias, 'prefecture')} = $${params.length}`);
  }

  if (eventType) {
    params.push(eventType);
    parts.push(`${column(tableAlias, 'event_type')} = $${params.length}`);
  }

  if (organizer) {
    params.push(organizer);
    parts.push(`${column(tableAlias, 'organizer')} = $${params.length}`);
  }

  if (region && region !== 'all') {
    const regionClause = buildRegionClause(tableAlias, region);
    if (regionClause) {
      parts.push(regionClause);
    }
  }

  return {
    whereClause: parts.length ? `WHERE ${parts.join(' AND ')}` : '',
    params,
  };
}
