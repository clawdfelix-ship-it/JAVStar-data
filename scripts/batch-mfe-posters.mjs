#!/usr/bin/env node
// 批量為 MFE 女優生成 A2/B/C 三張 4:5 poster（用 actress-promos 官方/公開相）
// 用法：node scripts/batch-mfe-posters.mjs [--only 641091,597844]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const OUT = join(D, 'mfe_posters');
mkdirSync(OUT, { recursive: true });

const eventIds = JSON.parse(readFileSync(join(D, 'mfe_eventids.json'), 'utf8'));
const only = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? process.argv[i + 1].split(',') : null; })();
// 只為有 promo 相嘅女優出人像海報
const promoDir = join(REPO, 'public/actress-promos');
const targets = Object.entries(eventIds)
  .filter(([aid]) => existsSync(join(promoDir, `${aid}.jpg`)))
  .filter(([aid]) => !only || only.includes(aid));

const gens = [
  ['A2', 'scripts/poster-event-intro-A2.mjs'],
  ['BC', 'scripts/poster-event-intro-BC.mjs'], // 一次出 B + C
];
let done = 0;
const log = [];
for (const [aid, eid] of targets) {
  for (const [kind, script] of gens) {
    try {
      const out = execFileSync('node', [join(REPO, script), '--event-id', eid], {
        cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      const saved = out.split('\n').filter((l) => l.includes('saved')).map((l) => l.trim());
      log.push(`${aid} ${kind}: ${saved.join(' | ')}`);
      done++;
    } catch (e) {
      log.push(`${aid} ${kind} FAIL: ${(e.stderr || e.message || '').toString().slice(0, 120)}`);
    }
  }
}
writeFileSync(join(OUT, '_batch_log.txt'), log.join('\n'));
console.log(log.join('\n'));
console.log(`\n完成 ${done}/${targets.length * 2} 個 generator run（每位 A2 + B + C 共 3 張）`);
