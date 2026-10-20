// jching-events.mjs — 海報資料源：由 JCHING 公開唯讀 events API 拉真實活動。
// 所有 poster script 共用，唔再 hardcode 場次。
//
// API: GET {BASE}/api/events?region=...&past=0&limit=2000
//   回傳 row：date_iso(YYYY-MM-DD) / event_type(meet|photo|offkai|other|dvd)
//             / prefecture / venue / organizer / title / actress_name / url
//
// 本地 override（唔入 repo）：~/.config/jching-poster.json
//   {
//     "base": "https://j-star-data.vercel.app",
//     "venues": { "2026-11-21|photo|192328": "旺角西洋菜南街 70-72 號 3 樓" },
//     "events": { "<event-id>": { "sessions": "3 場攝影會 ＋ 旺角快閃", "typeLabel": "香港粉絲攝影會" } }
//   }
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE_DEFAULT = 'https://j-star-data.vercel.app';

function loadOverride() {
  try {
    return JSON.parse(readFileSync(join(homedir(), '.config/jching-poster.json'), 'utf8'));
  } catch { return {}; }
}

// 簡單 argv：--from 2026-10-19 --to 2026-10-25 --region hk,taiwan --actress-id 192328 --past
// 回傳 { flags, _: [positionals] }，flag 嘅 value 唔會誤當 positional。
export function parseArgs(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { o[k] = next; i++; }
      else o[k] = true;
    } else {
      o._.push(a);
    }
  }
  return o;
}

const KIND_LABEL = { meet: '見面會', photo: '攝影會', offkai: 'OFF會', other: '其他', dvd: '發售' };
export const kindLabel = (t) => KIND_LABEL[t] || '其他';

// 港台城市歸類（同 API route 嘅 region 定義保持一致）
const TW = new Set(['台北','新北','高雄','台中','台南','桃園','基隆','新竹','嘉義','屏東','宜蘭','花蓮','台東']);
export function cityOf(row) {
  const p = row.prefecture || '';
  if (p.includes('香港')) return row.venue && row.venue !== '香港' ? row.venue : '香港';
  if (TW.has(p)) return p;
  return p || '其他';
}
const isHK = (r) => (r.prefecture || '').includes('香港');
const isTW = (r) => TW.has(r.prefecture || '');

// HKT 今日（UTC+8），用 ISO date
export function hktToday(d = new Date()) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00+08:00');
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
// 取包含 isoDay 嘅一週（禮拜一為一週之始）
export function weekRangeContaining(isoDay) {
  const d = new Date(isoDay + 'T00:00:00+08:00');
  const wd = (d.getDay() + 6) % 7; // 一=0 … 日=6
  const from = addDays(isoDay, -wd);
  return { from, to: addDays(from, 6) };
}

export async function fetchEvents({ past = false, base } = {}) {
  const cfg = loadOverride();
  const BASE = base || cfg.base || BASE_DEFAULT;
  const url = `${BASE}/api/events?limit=2000${past ? '&past=1' : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JCHING API ${res.status} ${url}`);
  const j = await res.json();
  return j.data || [];
}

// 週曆用：濾港台、可選區域/女優/日期範圍，輸出 7 天 flex 結構
export async function weeklyEvents(opts = {}) {
  const cfg = loadOverride();
  const today = opts.today || hktToday();
  const { from, to } = opts.from && opts.to
    ? { from: opts.from, to: opts.to }
    : weekRangeContaining(today);

  const regions = new Set(String(opts.region || 'hk,taiwan').split(','));
  let rows = await fetchEvents({ past: true, base: opts.base });
  rows = rows.filter((r) => {
    if (r.date_iso < from || r.date_iso > to) return false;
    if (regions.has('hk') && isHK(r)) { /* ok */ }
    else if (regions.has('taiwan') && isTW(r)) { /* ok */ }
    else return false;
    if (opts.actressId && String(r.actress_id) !== String(opts.actressId)) return false;
    return true;
  });

  const WD = ['一','二','三','四','五','六','日'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(from, i);
    const evs = rows
      .filter((r) => r.date_iso === iso)
      .map((r) => ({
        actress: r.actress_name || r.actress_id,
        org: (r.organizer || '').replace(/^javstarmeet$/i, 'JAVStarMeet'),
        city: cityOf(r),
        kind: kindLabel(r.event_type),
        raw: r,
      }));
    days.push({ md: iso.slice(5).replace('-', '/'), wd: WD[i], iso, evs });
  }

  // 統計
  const cityCount = {};
  let total = 0;
  for (const d of days) for (const e of d.evs) { total++; cityCount[e.city] = (cityCount[e.city] || 0) + 1; }

  return { from, to, days, total, cityCount };
}

// 活動介紹海報用：用 API row + 本地 override 組一場活動嘅展示資料
export function toIntroEvent(row, overrides = {}) {
  const cfg = loadOverride();
  const byId = cfg.events?.[String(row.id)] || {};
  const dateISO = row.date_iso;
  const d = new Date(dateISO + 'T00:00:00+08:00');
  const wd = ['日','一','二','三','四','五','六'][d.getDay()];
  const dateLabel = `${dateISO.replace(/-/g, '.')}（${wd}）`;

  const venueKey = `${dateISO}|${row.event_type}|${row.actress_id}`;
  const venue = overrides.venue || byId.venue || cfg.venues?.[venueKey] || cityOf(row);
  const org = (row.organizer || '').replace(/^javstarmeet$/i, 'JAVStarMeet') || 'JAVStarMeet';
  // 注意：DB name_cn 試過係垃圾（例如「古賀まつな【旧名】」），唔可信；
  // 中文名用 override actressCn map，否則退回日文顯示名。
  const cn = cfg.actressCn?.[String(row.actress_id)];
  const actress = cn || row.actress_name;

  return {
    id: row.id,
    actressId: String(row.actress_id),
    actressJa: row.actress_name,
    actress,
    date: dateLabel,
    dateISO,
    venue,
    org,
    typeLabel: overrides.typeLabel || byId.typeLabel || defaultTypeLabel(row),
    sessions: overrides.sessions || byId.sessions || '',
    sessionsChip: overrides.sessionsChip || byId.sessionsChip || '',
    hashtag: `#${org.replace(/\s+/g, '')}　#${actress}`,
    raw: row,
  };
}

// いよ -> 伊代 attemp：DB 有 name_cn 就用；呢度只係後備（日文漢字相同就原樣）
function cnFromJa(ja) { return ja || null; }

function defaultTypeLabel(row) {
  if ((row.title || '').includes('旺角快閃')) return '旺角快閃攝影見面會';
  if (row.event_type === 'photo') return '香港粉絲攝影會';
  if (row.event_type === 'meet') return '香港粉絲見面會';
  if (row.event_type === 'offkai') return 'OFF 會';
  return kindLabel(row.event_type);
}

// 搵單一場：--event-id 或 (--actress-id + --date + --type)
export async function findEvent(opts = {}) {
  let rows = await fetchEvents({ past: true, base: opts.base });
  // --event-id 最優先：俾咗就只按 id 鎖，唔再夾其他 filter
  if (opts.eventId) {
    const one = rows.filter((r) => String(r.id) === String(opts.eventId));
    if (one.length !== 1) throw new Error('搵唔到 event-id：' + opts.eventId);
    return one[0];
  }
  if (opts.actressId) rows = rows.filter((r) => String(r.actress_id) === String(opts.actressId));
  if (opts.date) rows = rows.filter((r) => r.date_iso === opts.date);
  if (opts.type) rows = rows.filter((r) => r.event_type === opts.type);
  if (opts.titleHas) rows = rows.filter((r) => (r.title || '').includes(opts.titleHas));
  if (rows.length === 0) throw new Error('搵唔到符合條件嘅 JCHING event：' + JSON.stringify(opts));
  if (rows.length > 1) {
    const ids = rows.map((r) => `${r.id}:${r.date_iso}|${r.event_type}|${r.title}`).join('\n  ');
    throw new Error(`搵到 ${rows.length} 場，請用 --event-id 鎖定：\n  ${ids}`);
  }
  return rows[0];
}
