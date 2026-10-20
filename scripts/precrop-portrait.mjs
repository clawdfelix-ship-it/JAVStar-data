// 用 sharp 預裁一張 face-centered 直向相（474×1000 比例 = 0.474），再畀 satori 鋪滿
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const SRC='/Users/siulungchan/projects/JAVStar-data/public/actress-promos/192328.jpg';
const OUT='/Users/siulungchan/.hermes/profiles/it/cache/scratch/promo_192328_portrait.jpg';

// Vision: face bbox 原圖 x404 y170 w515 h515 → 塊面中心 (661,427)，原圖 960×1280
// 目標框比例
const TW=474, TH=1000, targetRatio=TW/TH;

const meta = await sharp(SRC).metadata();
const iw=meta.width, ih=meta.height;
console.log('src',iw,ih);

// 以塊面中心為錨，crop 一個 targetRatio 區域；垂直方向：讓塊面落在上 1/3（海報構圖）
const faceCx=661, faceCy=427;
let cw = ih*targetRatio;          // 以全高計所需寬
let ch = ih;
if (cw > iw) {                    // 若所需寬超過原相，改以全寬
  cw = iw; ch = iw/targetRatio;
}
let left = faceCx - cw*0.5;
left = Math.max(0, Math.min(iw-cw, left));
// 垂直：塊面置於框 ~30% 處 → crop top = faceCy - 0.30*ch
let top = faceCy - ch*0.30;
top = Math.max(0, Math.min(ih-ch, top));
left=Math.round(left); top=Math.round(top); cw=Math.round(cw); ch=Math.round(ch);
console.log('crop', {left,top,cw,ch});

await sharp(SRC)
  .extract({left,top,width:cw,height:ch})
  .resize(TW,TH,{fit:'fill'})
  .jpeg({quality:88})
  .toFile(OUT);
console.log('saved',OUT);
