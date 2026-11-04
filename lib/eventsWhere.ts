/**
 * WHERE builder for /api/events.
 *
 * All client-supplied filter values (prefecture / eventType / organizer) are
 * returned as bound parameters ($1, $2, …) — never interpolated into the SQL
 * text — so the public, unauthenticated GET /api/events endpoint cannot be used
 * for SQL injection.
 */

// 台灣城市（來源只標「台灣」未註明城市者，匯入時預設歸 '台北'）。
const TAIWAN_CITIES = ['台北', '新北', '高雄', '台中', '台南', '桃園', '基隆', '新竹', '嘉義', '屏東', '宜蘭', '花蓮', '台東'];
const TW_LIST = TAIWAN_CITIES.map((c) => `'${c}'`).join(', ');

// 固定白名單子句：只有 key（japan/taiwan/hk/online）會被選中，值本身唔會拼接用戶輸入。
const REGION_CLAUSES: Record<string, string> = {
  japan: `prefecture IS NOT NULL AND prefecture != '' AND prefecture NOT IN (${TW_LIST}) AND prefecture != 'オンライン' AND prefecture NOT LIKE '%香港%'`,
  taiwan: `prefecture IN (${TW_LIST})`,
  hk: "prefecture LIKE '%香港%'",
  online: "prefecture = 'オンライン'",
};

export type EventsWhereInput = {
  past: boolean;
  prefecture?: string | null;
  eventType?: string | null;
  organizer?: string | null;
  region?: string | null;
};

export type EventsWhere = { text: string; params: string[] };

/**
 * @param opts.alias  true → qualify columns with `e.` (main query joins `events e`);
 *                    false → unqualified (count query selects `FROM events`).
 */
export function buildEventsWhere(input: EventsWhereInput, opts?: { alias?: boolean }): EventsWhere {
  const a = opts?.alias ? 'e.' : '';
  const params: string[] = [];
  const parts: string[] = [`${a}date_iso IS NOT NULL`];
  if (!input.past) parts.push(`${a}date_iso >= CURRENT_DATE`);
  parts.push(`${a}actress_id IS NOT NULL AND ${a}actress_id != '0' AND ${a}actress_id != 'unknown'`);
  if (input.prefecture) {
    params.push(input.prefecture);
    parts.push(`${a}prefecture = $${params.length}`);
  }
  if (input.eventType) {
    params.push(input.eventType);
    parts.push(`${a}event_type = $${params.length}`);
  }
  if (input.organizer) {
    params.push(input.organizer);
    parts.push(`${a}organizer = $${params.length}`);
  }
  const region = input.region;
  if (region && region !== 'all' && REGION_CLAUSES[region]) {
    parts.push(REGION_CLAUSES[region]);
  }
  return { text: `WHERE ${parts.join(' AND ')}`, params };
}
