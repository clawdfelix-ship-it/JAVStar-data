// 由品牌 vector（月曆+星）生成全套尺寸 PNG。
// 跑法：node scripts/gen-brand-assets.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// 標記內膽（viewBox 100x100，取自 public/favicon.svg）
const MARK = `
<defs>
  <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F4A6A6"/><stop offset="1" stop-color="#B83D5E"/>
  </linearGradient>
</defs>
<rect x="22" y="30" width="48" height="47" rx="7" fill="#ffffff" stroke="#2F4053" stroke-width="3.6"/>
<rect x="34.5" y="21" width="4.6" height="15" rx="2.3" fill="#2F4053"/>
<rect x="53" y="21" width="4.6" height="15" rx="2.3" fill="#2F4053"/>
<line x1="34" y1="45" x2="34" y2="69" stroke="#2F4053" stroke-width="2.2" stroke-linecap="round" opacity="0.35"/>
<line x1="46" y1="45" x2="46" y2="69" stroke="#2F4053" stroke-width="2.2" stroke-linecap="round" opacity="0.35"/>
<line x1="58" y1="45" x2="58" y2="69" stroke="#2F4053" stroke-width="2.2" stroke-linecap="round" opacity="0.35"/>
<path d="M60.5 47.5 L64.9 61.0 L79.0 61.0 L67.6 69.3 L72.0 82.8 L60.5 74.4 L49.0 82.8 L53.4 69.3 L42.0 61.0 L56.1 61.0 Z"
      fill="url(#sg)" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round"/>`;

// scale 係標記佔畫布比例；bg 可以係底色/gradient svg 字串
function square(size, scale, bg) {
  const m = size * scale;
  const off = (size - m) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <g transform="translate(${off},${off}) scale(${m / 100})">${MARK}</g>
  </svg>`;
}

const SOFT_BG = (s) =>
  `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stop-color="#FFF5F7"/><stop offset="1" stop-color="#FFFFFF"/>
   </linearGradient></defs><rect width="${s}" height="${s}" fill="url(#bg)"/>`;

const WINE_BG = (s) =>
  `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stop-color="#8B1A4A"/><stop offset="1" stop-color="#BE185D"/>
   </linearGradient></defs><rect width="${s}" height="${s}" fill="url(#bg)"/>`;

const OUT = 'brand-kit';
await mkdir(`${OUT}/favicons`, { recursive: true });

const jobs = [
  // favicons（透明底）
  [`${OUT}/favicons/favicon-16.png`, square(16, 0.96, ''), 16],
  [`${OUT}/favicons/favicon-32.png`, square(32, 0.94, ''), 32],
  [`${OUT}/favicons/favicon-48.png`, square(48, 0.92, ''), 48],
  // apple touch（白底色，iOS 自動圓角）
  [`${OUT}/apple-touch-icon-180.png`, square(180, 0.72, `<rect width="180" height="180" fill="#FFFFFF"/>`), 180],
  // PWA
  [`${OUT}/pwa-icon-192.png`, square(192, 0.7, SOFT_BG(192)), 192],
  [`${OUT}/pwa-icon-512.png`, square(512, 0.7, SOFT_BG(512)), 512],
  [`${OUT}/pwa-maskable-512.png`, square(512, 0.58, WINE_BG(512)), 512],
  // IG / Telegram 頭像（方形，app 自己裁圓形；縮到 0.64 預圓角削邊）
  [`${OUT}/social-avatar-1080.png`, square(1080, 0.64, SOFT_BG(1080)), 1080],
  [`${OUT}/social-avatar-wine-1080.png`, square(1080, 0.6, WINE_BG(1080)), 1080],
  // 純標記透明 PNG（彈性運用）
  [`${OUT}/logo-mark-1024.png`, square(1024, 0.96, ''), 1024],
];

for (const [file, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log('✓', file);
}

// 完整直向 logo（標記＋J-STAR／CALENDAR／中文副標，透明底）
{
  const W = 1000, H = 1160, ms = 460, mx = (W - ms) / 2, my = 60;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <g transform="translate(${mx},${my}) scale(${ms / 100})">${MARK}</g>
    <text x="${W / 2 - 1}" y="${my + ms + 150}" text-anchor="middle"
          font-family="'Helvetica Neue', Arial, sans-serif" font-size="150" font-weight="800"
          fill="#2F4053" letter-spacing="-2">J-STAR</text>
    <text x="${W / 2 + 10}" y="${my + ms + 235}" text-anchor="middle"
          font-family="'Helvetica Neue', Arial, sans-serif" font-size="86" font-weight="300"
          fill="#2F4053" letter-spacing="20">CALENDAR</text>
    <text x="${W / 2 + 3}" y="${my + ms + 335}" text-anchor="middle"
          font-family="'PingFang HK','Hiragino Sans CNS','Microsoft JhengHei',sans-serif" font-size="72"
          font-weight="500" fill="#5b6b7c" letter-spacing="6">星動行程追蹤平台</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/logo-full-1000.png`);
  console.log('✓', `${OUT}/logo-full-1000.png`);
}
console.log('DONE');
