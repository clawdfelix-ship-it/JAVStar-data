#!/usr/bin/env node
// 一次性：只針對兩筆修正做 dry-run / execute
// 用法：node scripts/tw-nov-fix-two.mjs          (dry)
//      node scripts/tw-nov-fix-two.mjs --execute (真寫入)
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const env = {};
for (const l of readFileSync(join(homedir(), '.config/jching-ingest.env'), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const execute = process.argv.includes('--execute');
const targets = new Set(['javstar-tw-1121-380512', 'javstar-tw-1121-835158']);
const all = JSON.parse(readFileSync(join(process.cwd(), 'scripts/hk-tw-nov-manifest.json'), 'utf8'));
const events = all.filter((e) => targets.has(e.id)).map(({ needsPlaceholder, ...rest }) => rest);

console.log('目標筆數：', events.length);
for (const e of events) console.log(' -', e.id, '|', e.title);

const r = await fetch(`${env.JCHING_BASE}/api/admin/events-upsert`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-ingest-token': env.INGEST_TOKEN },
  body: JSON.stringify({ mode: execute ? 'upsert' : 'dry', events }),
});
const j = await r.json();
console.log('\n' + (execute ? 'EXECUTE' : 'DRY'), 'HTTP', r.status);
console.log(JSON.stringify(j, null, 2).slice(0, 1500));
