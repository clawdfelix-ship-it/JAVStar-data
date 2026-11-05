#!/usr/bin/env node
// 抓事務所官方公開 profile 宣傳照 → public/actress-promos/<id>.jpg
// 資料源：scripts/agency-profile-map.json（每間事務所一個 adapter：profile_url + 圖片抽取規則）
//
// 用法：
//   node scripts/fetch-agency-promo.mjs                      # dry-run 全部
//   node scripts/fetch-agency-promo.mjs --agency t-powers    # 只跑某事務所
//   node scripts/fetch-agency-promo.mjs --id 597844          # 只跑一個女優
//   node scripts/fetch-agency-promo.mjs --execute            # 真正寫檔（預設 dry-run）
//   node scripts/fetch-agency-promo.mjs --execute --force    # 覆蓋已存在嘅相
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const MAP = JSON.parse(readFileSync(join(__dirname, 'agency-profile-map.json'), 'utf8'));
const OUT_DIR = join(REPO, 'public/actress-promos');
const SOURCES = join(OUT_DIR, 'sources.json');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const execute = has('--execute');
const force = has('--force');
const onlyAgency = val('--agency');
const onlyId = val('--id');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36';

// ---- 事務所 adapters：輸入 profile HTML，回傳官方宣傳相 URL（首選主視覺）----
const adapters = {
  // T-POWERS（WordPress）：profile slider 用 background-image，class p-talent-detail__vis-slider-img
  't-powers': (html) => {
    const m = html.match(/p-talent-detail__vis-slider-img[^>]*background-image:\s*url\(["']?([^"')]+)/);
    return m ? m[1] : null;
  },
  // マインズ Mine'S：detail 頁唯一一張 talent_images 直向相
  'mines': (html) => {
    const m = html.match(/<img[^>]+src=["']([^"']*talent_images[^"']+)["']/);
    if (!m) return null;
    return m[1].startsWith('http') ? m[1] : new URL(m[1], 'https://mines-pro.jp/').href;
  },
  // C-more：主相 img/model/<slug>/<slug>.jpg（唔要 top_ 橫 banner）
  'cmore': (html, profileUrl) => {
    const m = html.match(/<img[^>]+src=["']([^"']*img\/model\/[^"']+\/(?!top_)[^"']+\.jpg)["']/);
    if (!m) return null;
    return new URL(m[1], profileUrl).href;
  },
};

function loadSources() {
  try { return JSON.parse(readFileSync(SOURCES, 'utf8')); } catch { return {}; }
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.8' } });
  if (!res.ok) throw new Error(`profile HTTP ${res.status}`);
  return await res.text();
}

async function downloadImage(url, referer, minBytes = 8000) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: referer } });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!/image\/(jpe?g|png|webp)/.test(type)) throw new Error(`非圖片 content-type: ${type}`);
  if (buf.length < minBytes) throw new Error(`圖片太細（${buf.length} bytes），可能係占位圖`);
  return buf;
}

const sources = loadSources();
const jobs = [];
for (const [agency, entries] of Object.entries(MAP)) {
  if (agency.startsWith('_')) continue;
  if (onlyAgency && onlyAgency !== agency) continue;
  for (const [id, meta] of Object.entries(entries)) {
    if (onlyId && onlyId !== id) continue;
    jobs.push({ agency, id, ...meta });
  }
}

console.log(`目標 ${jobs.length} 位女優｜模式：${execute ? 'EXECUTE 寫檔' : 'DRY-RUN'}\n`);
let okN = 0, skipN = 0, failN = 0;

for (const job of jobs) {
  const outPath = join(OUT_DIR, `${job.id}.jpg`);
  const tag = `${job.id} ${job.name_ja}`;
  try {
    if (existsSync(outPath) && !force) {
      console.log(`SKIP ${tag}（已存在，--force 先覆蓋）`);
      skipN++;
      continue;
    }
    // 有直接 image_url 就跳過 HTML parse（細事務所/列表頁用）
    let imgUrl = job.image_url || null;
    if (!imgUrl) {
      const html = await fetchText(job.profile_url);
      const adapter = adapters[job.agency];
      if (!adapter) throw new Error(`無 adapter 且無 image_url：${job.agency}`);
      imgUrl = adapter(html, job.profile_url);
    }
    if (!imgUrl) throw new Error('抽唔到 profile 相 URL');
    // 方形/細事務所相可能較細：門檻降到 5KB（真占位圖通常 <2KB）
    const buf = await downloadImage(imgUrl, job.profile_url, 5000);

    if (!execute) {
      console.log(`DRY  ${tag} <- ${imgUrl} (${buf.length} bytes)`);
      okN++;
      continue;
    }
    mkdirSync(OUT_DIR, { recursive: true });
    // webp（BStar 等）統一轉 jpeg，其餘原樣寫入；輸出一律 <id>.jpg
    const isWebp = /\.webp(\?|$)/i.test(imgUrl);
    const outBuf = isWebp ? await sharp(buf).jpeg({ quality: 90 }).toBuffer() : buf;
    writeFileSync(outPath, outBuf);
    sources[job.id] = {
      name_ja: job.name_ja,
      agency: job.agency,
      source_page: job.profile_url,
      image_url: imgUrl,
      license: '事務所官方公開 profile 宣傳照',
      orientation: job.orientation || 'portrait',
      converted_from_webp: isWebp,
      fetched_at: new Date().toISOString(),
    };
    writeFileSync(SOURCES, JSON.stringify(sources, null, 2));
    console.log(`SAVE ${tag} -> actress-promos/${job.id}.jpg (${outBuf.length} bytes${isWebp ? ', webp->jpg' : ''})`);
    okN++;
  } catch (e) {
    console.log(`FAIL ${tag}: ${e.message}`);
    failN++;
  }
}

console.log(`\n完成：成功 ${okN}｜跳過 ${skipN}｜失敗 ${failN}${execute ? '' : '（dry-run，加 --execute 先寫檔）'}`);
if (failN > 0) process.exit(1);
