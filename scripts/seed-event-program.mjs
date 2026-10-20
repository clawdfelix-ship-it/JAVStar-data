#!/usr/bin/env node
/**
 * seed-event-program.mjs — 把 event-detail-record 產出嘅 program.json 寫入 JCHING events.program_json。
 *
 * 資料源（本機，唔入 repo）：
 *   ~/JAVStar/shared/artifacts/events/<檔名>_program.json
 *   取入面 events[]，每筆 event_id 對應一場活動。
 *
 * 用法：
 *   node scripts/seed-event-program.mjs                          # dry-run，只印將寫入嘅場
 *   node scripts/seed-event-program.mjs --file <path>            # 指定另一個 program.json
 *   node scripts/seed-event-program.mjs --execute                # 真正寫入 JCHING
 *   node scripts/seed-event-program.mjs --execute --only javstar-192328-20261121-photo
 *
 * 憑證：~/.config/jching-ingest.env  JCHING_BASE / INGEST_TOKEN
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function loadEnv(p) {
  const out = {};
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* missing */ }
  return out;
}

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

const EXECUTE = has('--execute');
const FILE = val('--file') || join(
  homedir(), 'JAVStar/shared/artifacts/events/篠原伊代_2026-11_program.json'
);
const ONLY = val('--only');
const jc = loadEnv(join(homedir(), '.config/jching-ingest.env'));
const BASE = jc.JCHING_BASE || 'https://j-star-data.vercel.app';

if (EXECUTE && !jc.INGEST_TOKEN) {
  console.error('缺少 ~/.config/jching-ingest.env（INGEST_TOKEN）— dry-run 唔需要');
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error('讀唔到 program.json：', FILE, e.message);
  process.exit(1);
}

if (!Array.isArray(doc.events)) {
  console.error('program.json 冇 events[]，格式唔對');
  process.exit(1);
}

let picked = doc.events;
if (ONLY) picked = picked.filter((e) => e.event_id === ONLY);

// 每筆組出 upsert payload。核心欄位由現有 API row 帶返，program 直接掛上去。
const out = [];
for (const ev of picked) {
  out.push({
    id: ev.event_id,
    program: {
      title: ev.title,
      venue: ev.venue,
      time: ev.time,
      duration_min: ev.duration_min,
      format: ev.format,
      sessions: ev.sessions,
      includes: ev.includes,
      schedule: ev.schedule,
      addons: ev.addons,
      perks: ev.perks,
      entry_ticket: ev.entry_ticket,
      inventory_by_session: ev.inventory_by_session,
      capacity_text: ev.capacity_text,
      package: ev.package,
      note: ev.note,
      costume: ev.costume,
      costume_status: ev.costume_status,
      costume_per_session: ev.costume_per_session,
      rules: ev.rules,
      id_check: ev.id_check,
    },
  });
}

console.log('來源：', FILE);
console.log(' actresses：', doc.actress?.name_cn || doc.actress?.name_ja || '?', `(id=${doc.actress?.id})`);
console.log(' 將寫入：', out.length, '場\n');
for (const e of out) {
  const p = e.program;
  const bits = [
    p.time,
    p.capacity_text,
    Array.isArray(p.sessions) ? `${p.sessions.length} 場次` : null,
    Array.isArray(p.addons) ? `${p.addons.length} 加購` : null,
    Array.isArray(p.perks) ? `${p.perks.length} 特典` : null,
  ].filter(Boolean);
  console.log(` ${e.id}\n   ${p.title}${bits.length ? '　[' + bits.join(' / ') + ']' : ''}`);
}

if (!EXECUTE) {
  console.log('\n(dry-run。加 --execute 先會真正寫入)');
  process.exit(0);
}

const res = await fetch(`${BASE}/api/admin/events-upsert`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-ingest-token': jc.INGEST_TOKEN },
  body: JSON.stringify({ events: out, mode: 'upsert' }),
});
const text = await res.text();
console.log('\nHTTP', res.status, text.slice(0, 400));
if (!res.ok) process.exit(1);