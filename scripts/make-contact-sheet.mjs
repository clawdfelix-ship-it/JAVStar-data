import sharp from 'sharp';
import { join } from 'node:path';
// 通用 contact sheet：node scripts/make-contact-sheet.mjs <id1,id2,...> [outName]
const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const ids = process.argv[2].split(',');
const outName = process.argv[3] || 'sheet';
const cols = Math.min(ids.length, 5);
const rows = Math.ceil(ids.length / cols);
const cellW = 160, cellH = 338, gap = 6;
const W = cols * cellW + (cols + 1) * gap;
const H = rows * cellH + (rows + 1) * gap;
const tiles = [];
for (let i = 0; i < ids.length; i++) {
  const r = Math.floor(i / cols), c = i % cols;
  const buf = await sharp(join(D, `promo_${ids[i]}_portrait.jpg`))
    .resize(cellW, cellH, { fit: 'fill' }).jpeg({ quality: 72 }).toBuffer();
  tiles.push({ input: buf, left: gap + c * (cellW + gap), top: gap + r * (cellH + gap) });
}
const out = join(D, `${outName}.jpg`);
await sharp({ create: { width: W, height: H, channels: 3, background: '#E0D3B0' } })
  .composite(tiles).jpeg({ quality: 78 }).toFile(out);
console.log(out, W, 'x', H, ids.join(','));
