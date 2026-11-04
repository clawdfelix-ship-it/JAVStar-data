#!/usr/bin/env node
// MEGA FANS EXPO 2026 香港站（11/13-15 富豪機場酒店）→ JCHING events manifest
// Option A：每女優一筆，日期錨定首日 2026-11-13，標題帶完整檔期（11/13-15）。
// 第三方主辦 → organizer=community；event_type=meet（綜合展互動/見面會）。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// 中文名（海報/前台顯示用，唔信 DB name_cn）→ JCHING actress id
const A = {
  "河北彩花": "945093", "小野六花": "822902", "瀨戶環奈": "125605", "伊藤舞雪": "995886",
  "八掛海": "717941", "七森莉莉": "597844", "紗倉真菜": "228437", "明里紬": "273627",
  "大槻響": "14008", "本庄鈴": "493582", "櫻空桃": "71250", "田野憂": "163082",
  "淺野心": "687516", "美園和花": "113949", "七嶋舞": "269581", "MINAMO": "876195",
  "雛乃花音": "272292", "楓富愛": "666598", "青空光": "380512", "涼森玲夢": "533604",
  "金松季步": "291714", "神木麗": "671983", "楪可憐": "955286", "吉高寧寧": "502570",
  "彌生美月": "272417", "惠理": "19506", "西宮夢": "973203", "宮下玲奈": "641091",
};

const DATE = "2026-11-13";
const VENUE = "香港富豪機場酒店";
const URL = "https://www.megafansexpo.com/zh-TW/schedule";
const events = [];
const seen = new Set();

for (const [cn, aid] of Object.entries(A)) {
  const id = `javstar-hk-20261113-${aid}-mfe`;
  if (seen.has(id)) { console.error("dup id", id); process.exit(1); }
  seen.add(id);
  events.push({
    id,
    actress_id: aid,
    title: `【MFE】${cn} MEGA FANS EXPO 香港（11/13-15）`,
    date: DATE,
    prefecture: "香港",
    venue: VENUE,
    event_type: "meet",
    url: URL,
    organizer: "community",
  });
}

writeFileSync(join(process.cwd(), 'scripts/hk-mfe-manifest.json'), JSON.stringify(events, null, 2));
console.log("總筆數", events.length);
for (const e of events) console.log(`  #${e.actress_id} ${e.title}`);
