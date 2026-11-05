#!/usr/bin/env node
// 批量為 MFE 女優生成 C 版 4:5 full-bleed poster（用 actress-promos 官方/公開相）
// 用法：node scripts/batch-mfe-posters.mjs [--only 641091,597844]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
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

let done = 0, fail = 0;
const log = [];
for (const [aid, eid] of targets) {
  try {
    const out = execFileSync('node', [join(REPO, 'scripts/poster-event-intro-BC.mjs'), '--event-id', eid, '--only-c'], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const saved = out.split('\n').filter((l) => l.includes('saved')).map((l) => l.trim());
    // 收集 C 版到 mfe_posters/<aid>_C.png
    const cSrc = join(D, `l2_event_intro_C_${aid}_${eid}.png`);
    if (existsSync(cSrc)) copyFileSync(cSrc, join(OUT, `${aid}_C.png`));
    log.push(`${aid} C: ${saved.join(' | ')}`);
    done++;
  } catch (e) {
    log.push(`${aid} C FAIL: ${(e.stderr || e.message || '').toString().slice(0, 120)}`);
    fail++;
  }
}
writeFileSync(join(OUT, '_batch_log.txt'), log.join('\n'));
console.log(log.join('\n'));
console.log(`\n完成 C 版 ${done}/${targets.length}（失敗 ${fail}），輸出資料夾：${OUT}`);
