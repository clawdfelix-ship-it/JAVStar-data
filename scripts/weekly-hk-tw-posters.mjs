#!/usr/bin/env node
// 每週日生成「嚟緊星期一至日」台灣／香港活動總覽草稿；只產圖及 caption，唔自動發佈 IG。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hktToday, weeklyEvents } from './jching-events.mjs';

const REPO = '/Users/siulungchan/projects/JAVStar-data';
const ROOT = '/Users/siulungchan/.hermes/profiles/jching/data/weekly-posters';
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00+08:00`);
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
};
const today = hktToday();
const weekday = new Date(`${today}T00:00:00+08:00`).getDay();
const daysUntilNextMonday = (8 - weekday) % 7 || 7;
const from = addDays(today, daysUntilNextMonday);
const to = addDays(from, 6);
const outDir = join(ROOT, `${from}_${to}`);
mkdirSync(outDir, { recursive: true });

const configs = [
  { region: 'taiwan', label: '台灣', file: 'taiwan.png', tags: ['女優活動', '台灣攝影會', '台北攝影會', '攝影會', '見面會'] },
  { region: 'hk', label: '香港', file: 'hong-kong.png', tags: ['女優活動', '香港攝影會', '攝影會', '見面會'] },
];
const result = { from, to, generated_at: new Date().toISOString(), posts: [] };

for (const cfg of configs) {
  const image = join(outDir, cfg.file);
  execFileSync('node', [
    'scripts/poster-week-v3.mjs', image,
    '--from', from, '--to', to, '--region', cfg.region,
  ], { cwd: REPO, stdio: ['ignore', 'pipe', 'inherit'] });
  const storyImage = join(outDir, `${cfg.region}-story.png`);
  execFileSync('node', [
    'scripts/weekly-story-9x16.mjs', '--region', cfg.region,
    '--poster', image, '--from', from, '--to', to, '--out', storyImage,
  ], { cwd: REPO, stdio: ['ignore', 'pipe', 'inherit'] });

  const week = await weeklyEvents({ from, to, region: cfg.region });
  const actresses = new Set();
  const organizers = new Set();
  for (const day of week.days) for (const e of day.evs) {
    if (e.raw.continuation) continue;
    if (e.raw.aggregated) {
      for (const name of e.raw.participants || []) actresses.add(name);
      organizers.add('MEGA FANS EXPO');
    } else {
      if (e.actress && !/綜合活動|展覽/.test(e.actress)) actresses.add(e.actress);
      if (e.org && !/^(community|合作夥伴)$/i.test(e.org)) organizers.add(e.org);
    }
  }
  const cleanTag = (s) => String(s).normalize('NFKC').replace(/[\p{P}\p{S}\s]/gu, '');
  const hashtags = [...new Set(['JCHING', ...organizers, ...actresses, ...cfg.tags]
    .map(cleanTag).filter(Boolean))].slice(0, 30).map((t) => `#${t}`).join(' ');
  const caption = [
    `📅 ${cfg.label}女優活動總覽｜${from.replaceAll('-', '.')} — ${to.slice(5).replace('-', '.')}`,
    '',
    week.total
      ? `嚟緊一週${cfg.label}共有 ${week.total} 場已公佈活動，日期、女優、主辦及活動類型見圖。`
      : `嚟緊一週暫未有已公佈嘅${cfg.label}活動。`,
    '',
    '更多活動資料：https://j-star-data.vercel.app',
    '',
    hashtags,
  ].join('\n');
  const captionFile = join(outDir, `${cfg.region}-caption.txt`);
  writeFileSync(captionFile, caption + '\n');
  result.posts.push({ region: cfg.region, label: cfg.label, total: week.total, image, story_image: storyImage, caption_file: captionFile });
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(result, null, 2) + '\n');
for (const post of result.posts) {
  console.log(`${post.label}活動總覽｜${from} 至 ${to}｜${post.total} 場`);
  console.log(`MEDIA:${post.image}`);
  console.log(`MEDIA:${post.story_image}`);
  console.log(`Caption：${post.caption_file}`);
}
