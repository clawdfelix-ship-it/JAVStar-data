#!/usr/bin/env node
// 每週日生成「嚟緊星期一至日」台灣／香港活動總覽草稿；只產圖及 caption，唔自動發佈 IG。
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hktToday, upcomingWeekRange, weeklyEvents } from './jching-events.mjs';

const REPO = '/Users/siulungchan/projects/JAVStar-data';
const ROOT = '/Users/siulungchan/.hermes/profiles/jching/data/weekly-posters';
const SITE = 'https://www.jching-calendar.com';
const HANDLES = JSON.parse(readFileSync(new URL('./weekly-story-handles.json', import.meta.url), 'utf8'));
const MFE_HANDLES = JSON.parse(readFileSync(new URL('./mfe-instagram-handles.json', import.meta.url), 'utf8'));
const today = hktToday();
const { from, to } = upcomingWeekRange();
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

  // 收集活動行：每行 = 場次描述 + 對應 IG @handle（caption 用 @，Story 用 user_tags）
  const rows = [];
  const organizers = new Set();
  const storyHandles = new Set();
  for (const day of week.days) {
    for (const e of day.evs) {
      if (e.raw.continuation) continue;
      const organizer = e.raw.aggregated ? e.raw.organizer : e.org;
      if (organizer && !/^(community|合作夥伴)$/i.test(organizer)) organizers.add(organizer);
      const orgHandle = HANDLES.organizers[organizer] || null;
      if (orgHandle) storyHandles.add(orgHandle);

      let actressHandle = null;
      if (e.raw.aggregated) {
        // MFE 綜合展：全部出演者都加入 Story mention（上限 26 個，稍後 slice）
        for (const p of e.raw.participants || []) {
          const h = MFE_HANDLES[p.id]?.instagram;
          if (h) storyHandles.add(h);
        }
      } else if (e.actress && !/綜合活動|展覽/.test(e.actress)) {
        actressHandle = HANDLES.actresses[e.actress] || null;
        if (actressHandle) storyHandles.add(actressHandle);
      }
      rows.push({ day, e, organizer, orgHandle, actressHandle });
    }
  }

  // 活動正文：每場一行 + JCHING 詳情頁連結
  const dayLabel = (iso) => {
    const d = new Date(`${iso}T00:00:00+08:00`);
    // getDay() 0=星期日
    const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${iso.slice(5).replace('-', '/')}（${wd}）`;
  };
  const detailUrl = (e) => {
    const id = e.raw.aggregated ? (e.raw.participants || [])[0]?.rawId : e.raw.id;
    // manual-* 係本地補充場，唔喺 DB，無對應詳情頁 → 導去區域列表
    if (!id || String(id).startsWith('manual-')) return `${SITE}/events?region=${cfg.region}`;
    return `${SITE}/events/${id}`;
  };
  const lines = [];
  for (const r of rows) {
    let name;
    if (r.e.raw.aggregated) {
      // MFE：活動名 + 全體出演 @handle（逐個列，女優唔用 hashtag）
      const handles = (r.e.raw.participants || [])
        .map((p) => MFE_HANDLES[p.id]?.instagram)
        .filter(Boolean);
      name = `MEGA FANS EXPO（${handles.length} 位女優）`;
      const parts = [`📌 ${dayLabel(r.day.iso)} ${name}`];
      if (r.organizer) parts.push(`主辦 ${r.orgHandle ? `@${r.orgHandle}` : r.organizer}`);
      if (r.e.raw.venue || r.e.venue || r.e.city) parts.push(`📍 ${r.e.raw.venue || r.e.venue || r.e.city}`);
      if (r.e.kind) parts.push(r.e.kind);
      parts.push(`👇 ${detailUrl(r.e)}`);
      lines.push(parts.join('　'));
      lines.push(`出演：${handles.map((h) => `@${h}`).join(' ')}`);
      continue;
    }
    name = r.e.actress;
    // 佔位女優「綜合活動・展覽」→ 用真實活動標題（去掉【主辦】前綴）
    if (/綜合活動|展覽/.test(name)) {
      const t = String(r.e.raw.title || '')
        .replace(/^【[^】]+】\s*/, '')
        .replace(/（[^）]*）\s*$/, '')
        .split(/\s+/)[0]          // 只留主名稱，細項唔入 caption
        .trim();
      name = t || name;
    }
    const parts = [`📌 ${dayLabel(r.day.iso)} ${name}${r.actressHandle ? ` @${r.actressHandle}` : ''}`];
    if (r.organizer) parts.push(`主辦 ${r.orgHandle ? `@${r.orgHandle}` : r.organizer}`);
    if (r.e.raw.venue || r.e.venue || r.e.city) parts.push(`📍 ${r.e.raw.venue || r.e.venue || r.e.city}`);
    if (r.e.kind) parts.push(r.e.kind);
    parts.push(`👇 ${detailUrl(r.e)}`);
    lines.push(parts.join('　'));
  }

  // hashtag：只留主辦、JCHING、活動類型（唔再逐個女優，女優改用 @handle）
  const cleanTag = (s) => String(s).normalize('NFKC').replace(/[\p{P}\p{S}\s]/gu, '');
  const hashtags = [...new Set(['JCHING', ...organizers, '見面會', '粉絲活動', '攝影會']
    .map(cleanTag).filter(Boolean))].map((t) => `#${t}`).join(' ');

  const caption = [
    `📅 ${cfg.label}女優活動總覽｜${from.replaceAll('-', '.')} — ${to.slice(5).replace('-', '.')}`,
    '',
    week.total
      ? `嚟緊一週${cfg.label}共有 ${week.total} 場已公佈活動，詳情見圖 👇`
      : `嚟緊一週暫未有已公佈嘅${cfg.label}活動。`,
    ...(lines.length ? ['', ...lines] : []),
    '',
    `完整活動日程：${SITE}/events?region=${cfg.region}`,
    '',
    hashtags,
  ].join('\n');
  const captionFile = join(outDir, `${cfg.region}-caption.txt`);
  writeFileSync(captionFile, caption + '\n');

  // Story 可點擊 mention：每 Story 上限 26 個 user_tags，超出會令 container 失敗
  const storyTags = [...storyHandles].slice(0, 26).map((username) => ({ username }));
  const storyTagsFile = join(outDir, `${cfg.region}-story-tags.json`);
  writeFileSync(storyTagsFile, JSON.stringify(storyTags, null, 2) + '\n');

  result.posts.push({
    region: cfg.region, label: cfg.label, total: week.total,
    image, story_image: storyImage, caption_file: captionFile, story_tags_file: storyTagsFile,
    story_mentions: storyTags.map((t) => t.username),
  });
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`⏰ 週日 10:30 自動發佈（台灣 Feed→Story、香港 Feed→Story）`);
console.log(`📌 有 30 分鐘 review：想改就直接覆「改」，我會暫停發佈並等你指示。唔覆就照發。`);
console.log('---');
for (const post of result.posts) {
  console.log(`${post.label}活動總覽｜${from} 至 ${to}｜${post.total} 場`);
  console.log(`MEDIA:${post.image}`);
  console.log(`MEDIA:${post.story_image}`);
  console.log(`Caption（${post.region}）：`);
  console.log(readFileSync(post.caption_file, 'utf8').trim());
  console.log(`Story mention：${post.story_mentions.length} 個 @handle`);
  console.log('---');
}
