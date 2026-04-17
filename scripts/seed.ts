/**
 * Seed Script - Populate database with initial demo data
 * 
 * Run with: npx tsx scripts/seed.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'av-intelligence.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Seed data
const actresses = [
  { id: 'EBODY-001', name_ja: '橘琉奈', name_cn: '橘琉奈', birthday: '2001-03-15', height: 158, bust: 86, waist: 58, hip: 88, debut_date: '2023-06-01' },
  { id: 'SSPB-002', name_ja: '涼森芽太快樂', name_cn: '涼森芽太快樂', birthday: '2000-08-22', height: 155, bust: 82, waist: 56, hip: 85, debut_date: '2022-04-01' },
  { id: 'MIDE-003', name_ja: '楓今日子和', name_cn: '楓今日子和', birthday: '1999-11-03', height: 162, bust: 88, waist: 60, hip: 90, debut_date: '2021-01-15' },
  { id: 'PPV-004', name_ja: '深田詠美', name_cn: '深田詠美', birthday: '1998-08-18', height: 163, bust: 90, waist: 62, hip: 92, debut_date: '2018-11-01' },
  { id: 'MXMS-005', name_ja: '三上悠亜', name_cn: '三上悠亜', birthday: '1995-08-28', height: 154, bust: 83, waist: 57, hip: 87, debut_date: '2015-02-01' },
  { id: 'SSIS-006', name_ja: '架乃美味', name_cn: '架乃美味', birthday: '2002-07-14', height: 160, bust: 87, waist: 59, hip: 89, debut_date: '2023-03-01' },
  { id: 'ABP-007', name_ja: '相澤みなみ', name_cn: '相澤みなみ', birthday: '1996-12-25', height: 165, bust: 91, waist: 63, hip: 93, debut_date: '2019-06-01' },
  { id: 'SAME-008', name_ja: '莎拉Queen', name_cn: '莎拉Queen', birthday: '1997-05-12', height: 168, bust: 95, waist: 65, hip: 96, debut_date: '2017-09-01' },
  { id: 'JUL-009', name_ja: '潤姬', name_cn: '潤姬', birthday: '1993-03-30', height: 156, bust: 84, waist: 58, hip: 86, debut_date: '2014-01-01' },
  { id: 'ONE-010', name_ja: '奧崎澪', name_cn: '奧崎澪', birthday: '2003-01-20', height: 159, bust: 85, waist: 57, hip: 87, debut_date: '2024-02-01' },
];

const events = [
  { id: 'evt-001', actress_id: 'EBODY-001', title: '【LIVE】橘琉奈 初次個人LIVE', venue: '秋葉原 theaters', prefecture: '東京', datetime: '2026-04-20 19:00', event_type: 'live', url: 'https://av-event.jp/ebody001' },
  { id: 'evt-002', actress_id: 'SSPB-002', title: '涼森芽太快樂 粉絲感謝祭', venue: '新宿BON', prefecture: '東京', datetime: '2026-04-22 14:00', event_type: 'fanmeet', url: 'https://av-event.jp/sspb002' },
  { id: 'evt-003', actress_id: 'MIDE-003', title: '楓今日子和 寫真握手會', venue: '涉谷TOKYO', prefecture: '東京', datetime: '2026-04-25 11:00', event_type: 'handshake', url: 'https://av-event.jp/mide003' },
  { id: 'evt-004', actress_id: 'PPV-004', title: '深田詠美 10周年紀念活動', venue: '池袋sunshine', prefecture: '東京', datetime: '2026-05-01 13:00', event_type: 'anniversary', url: 'https://av-event.jp/ppv004' },
  { id: 'evt-005', actress_id: 'MXMS-005', title: '三上悠亜 畢業演唱會', venue: '橫濱ARENA', prefecture: '神奈川', datetime: '2026-05-15 18:00', event_type: 'concert', url: 'https://av-event.jp/mxms005' },
  { id: 'evt-006', actress_id: 'SSIS-006', title: '架乃美味 生日祭', venue: '大阪NMB48', prefecture: '大阪', datetime: '2026-04-28 15:00', event_type: 'birthday', url: 'https://av-event.jp/ssis006' },
  { id: 'evt-007', actress_id: 'ABP-007', title: '相澤みなみ ONLINE座談會', venue: '線上活動', prefecture: '全國', datetime: '2026-04-30 20:00', event_type: 'online', url: 'https://av-event.jp/abp007' },
  { id: 'evt-008', actress_id: 'EBODY-001', title: '橘琉奈 迷你LIVE #2', venue: '秋葉原 theaters', prefecture: '東京', datetime: '2026-05-05 19:00', event_type: 'live', url: 'https://av-event.jp/ebody001-2' },
  { id: 'evt-009', actress_id: 'SAME-008', title: '莎拉Queen 寫真集簽售會', venue: '池袋sunshine', prefecture: '東京', datetime: '2026-05-10 12:00', event_type: 'handshake', url: 'https://av-event.jp/same008' },
  { id: 'evt-010', actress_id: 'ONE-010', title: '奧崎澪 初次亮相活動', venue: '涉谷TOKYO', prefecture: '東京', datetime: '2026-04-18 14:00', event_type: 'debut', url: 'https://av-event.jp/one010' },
  { id: 'evt-011', actress_id: 'PPV-004', title: '深田詠美 映畫出演纪念', venue: '新宿K cinema', prefecture: '東京', datetime: '2026-04-15 10:00', event_type: 'movie', url: 'https://av-event.jp/ppv004-2' },
  { id: 'evt-012', actress_id: 'JUL-009', title: '潤姬 粉丝见面会', venue: '台北W hotel', prefecture: '台湾', datetime: '2026-05-20 14:00', event_type: 'fanmeet', url: 'https://av-event.jp/jul009' },
];

const actressEventsCount = [
  { actress_id: 'EBODY-001', total_events: 2, year_2025_events: 0, year_2026_events: 2, month_04_2026_events: 2 },
  { actress_id: 'SSPB-002', total_events: 1, year_2025_events: 1, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'MIDE-003', total_events: 1, year_2025_events: 1, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'PPV-004', total_events: 2, year_2025_events: 1, year_2026_events: 2, month_04_2026_events: 2 },
  { actress_id: 'MXMS-005', total_events: 1, year_2025_events: 0, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'SSIS-006', total_events: 1, year_2025_events: 0, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'ABP-007', total_events: 1, year_2025_events: 0, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'SAME-008', total_events: 1, year_2025_events: 0, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'JUL-009', total_events: 1, year_2025_events: 0, year_2026_events: 1, month_04_2026_events: 1 },
  { actress_id: 'ONE-010', total_events: 1, year_2025_events: 0, year_2026_events: 1, month_04_2026_events: 1 },
];

console.log('🌱 Seeding database...');

// Clear existing data
db.exec('DELETE FROM votes');
db.exec('DELETE FROM actress_events_count');
db.exec('DELETE FROM events');
db.exec('DELETE FROM actresses');

// Insert actresses
const insertActress = db.prepare(`
  INSERT INTO actresses (id, name_ja, name_cn, birthday, height, bust, waist, hip, debut_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const a of actresses) {
  insertActress.run(a.id, a.name_ja, a.name_cn, a.birthday, a.height, a.bust, a.waist, a.hip, a.debut_date);
}
console.log(`✅ Inserted ${actresses.length} actresses`);

// Insert events
const insertEvent = db.prepare(`
  INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type, url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const e of events) {
  insertEvent.run(e.id, e.actress_id, e.title, e.venue, e.prefecture, e.datetime, e.event_type, e.url);
}
console.log(`✅ Inserted ${events.length} events`);

// Insert actress_events_count
const insertCount = db.prepare(`
  INSERT INTO actress_events_count (actress_id, total_events, year_2025_events, year_2026_events, month_04_2026_events)
  VALUES (?, ?, ?, ?, ?)
`);

for (const c of actressEventsCount) {
  insertCount.run(c.actress_id, c.total_events, c.year_2025_events, c.year_2026_events, c.month_04_2026_events);
}
console.log(`✅ Inserted ${actressEventsCount.length} event counts`);

console.log('🎉 Database seeding complete!');
console.log(`📊 Total actresses: ${db.prepare('SELECT COUNT(*) as c FROM actresses').get().c}`);
console.log(`📊 Total events: ${db.prepare('SELECT COUNT(*) as c FROM events').get().c}`);

db.close();
