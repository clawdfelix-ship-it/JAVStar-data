// 用 sharp 預裁一張 face-centered 直向相（474×1000 比例 = 0.474），再畀 satori 鋪滿
//
// 用法：
//   node scripts/precrop-portrait.mjs --id 192328
//   node scripts/precrop-portrait.mjs --id 192328 --face-cx 661 --face-cy 427
//
// 面部中心座標（每張宣傳相唔同）可放 ~/.config/jching-poster.json：
//   { "faces": { "192328": { "cx": 661, "cy": 427 } } }
// 冇座標就用原圖正中（頸項通常偏中），之後可眼仔再調。
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { parseArgs } from './jching-events.mjs';

const args = parseArgs();
const id = String(args.id || '192328');

function loadOverride() {
  try { return JSON.parse(readFileSync(join(homedir(), '.config/jching-poster.json'), 'utf8')); }
  catch { return {}; }
}
const cfg = loadOverride();
const face = cfg.faces?.[id] || {};
const faceCx = Number(args['face-cx'] ?? face.cx ?? 0);  // 0 = 待 metadata 後用正中
const faceCy = Number(args['face-cy'] ?? face.cy ?? 0);

const REPO = '/Users/siulungchan/projects/JAVStar-data';
const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const SRC = args.src || `${REPO}/public/actress-promos/${id}.jpg`;
const OUT = args.out || `${D}/promo_${id}_portrait.jpg`;
if (!existsSync(SRC)) { console.error('搵唔到相：', SRC); process.exit(1); }

// 目標框比例
const TW=474, TH=1000, targetRatio=TW/TH;

const meta = await sharp(SRC).metadata();
const iw=meta.width, ih=meta.height;
console.log('src',iw,ih);

const cx = faceCx || iw/2;
const cy = faceCy || ih*0.32;

// 以塊面中心為錨，crop 一個 targetRatio 區域；垂直方向：讓塊面落在上 1/3（海報構圖）
let cw = ih*targetRatio;          // 以全高計所需寬
let ch = ih;
if (cw > iw) {                    // 若所需寬超過原相，改以全寬
  cw = iw; ch = iw/targetRatio;
}
let left = cx - cw*0.5;
left = Math.max(0, Math.min(iw-cw, left));
// 垂直：塊面置於框 ~30% 處 → crop top = cy - 0.30*ch
let top = cy - ch*0.30;
top = Math.max(0, Math.min(ih-ch, top));
left=Math.round(left); top=Math.round(top); cw=Math.round(cw); ch=Math.round(ch);
console.log('crop', {left,top,cw,ch},'face anchor', {cx:Math.round(cx),cy:Math.round(cy)});

mkdirSync(dirname(OUT), { recursive: true });
await sharp(SRC)
  .extract({left,top,width:cw,height:ch})
  .resize(TW,TH,{fit:'fill'})
  .jpeg({quality:88})
  .toFile(OUT);
console.log('saved',OUT);
