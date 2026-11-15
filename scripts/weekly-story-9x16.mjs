#!/usr/bin/env node
// 台灣／香港週曆 4:5 海報 → 9:16 Story；等比 contain，唔拉伸。
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const region = arg('--region');
const posterPath = resolve(arg('--poster') || '');
const outPath = resolve(arg('--out') || '');
const from = arg('--from');
const to = arg('--to');
if (!['hk', 'taiwan'].includes(region) || !existsSync(posterPath) || !outPath || !from || !to) {
  throw new Error('要 --region hk|taiwan --poster --from YYYY-MM-DD --to YYYY-MM-DD --out');
}
const label = region === 'hk' ? '香港' : '台灣';
const bg = region === 'hk' ? '#FFFFFF' : '#F0F0D8';
const C = { ink: '#3D2B0A', gold: '#E0A050', rose: '#A03E3E', roseBg: '#FBE6E6', sub: '#8A5A28' };
const FONT_DIR = existsSync(`${process.env.HOME}/.hermes/fonts/NotoSansTC-Regular.otf`)
  ? `${process.env.HOME}/.hermes/fonts` : '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const fonts = [
  { name: 'Noto', data: readFileSync(`${FONT_DIR}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: 'Noto', data: readFileSync(`${FONT_DIR}/NotoSansTC-Bold.otf`), weight: 700 },
];
const posterB64 = `data:image/png;base64,${readFileSync(posterPath).toString('base64')}`;
const h = (type, props = {}, ...children) => ({ type, props: { ...props, children: children.flat() } });
const W = 1080, H = 1920;
const range = `${from.replaceAll('-', '.')} — ${to.slice(5).replace('-', '.')}`;

const tree = h('div', { style: { width: W, height: H, background: bg, fontFamily: 'Noto', display: 'flex', flexDirection: 'column', alignItems: 'center' } },
  h('div', { style: { height: 285, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 } },
    h('div', { style: { display: 'flex', fontSize: 28, fontWeight: 700, color: C.gold, letterSpacing: 3 } }, 'JCHING 活動總覽 · IG STORY'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 22 } },
      h('div', { style: { display: 'flex', padding: '8px 20px', borderRadius: 12, background: C.roseBg, border: `3px solid ${C.rose}`, fontSize: 44, fontWeight: 700, color: C.rose, letterSpacing: 4 } }, label),
      h('div', { style: { display: 'flex', fontSize: 27, fontWeight: 700, color: C.rose } }, range)),
  ),
  h('img', { src: posterB64, width: 1080, height: 1350, style: { width: 1080, height: 1350, objectFit: 'contain', flexShrink: 0 } }),
  h('div', { style: { height: 285, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, paddingBottom: 30 } },
    h('div', { style: { display: 'flex', fontSize: 32, fontWeight: 700, color: C.ink } }, `${label}嚟緊一週活動總覽`),
    h('div', { style: { display: 'flex', fontSize: 25, fontWeight: 700, color: C.sub } }, '完整活動日程及詳情'),
    h('div', { style: { display: 'flex', fontSize: 24, color: C.sub } }, 'j-star-data.vercel.app')),
);

const svg = await satori(tree, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
writeFileSync(outPath, png);
console.log('saved', outPath, png.length, `(${W}×${H}) ${label}`);
