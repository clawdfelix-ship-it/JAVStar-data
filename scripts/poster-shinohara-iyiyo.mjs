// 篠原伊代 2026/11/21-22 香港場整合海報（C 版 full-bleed 風格，1080×1350 4:5）
// 用法：
//   node scripts/poster-shinohara-iyiyo.mjs --day 21   # 11/21 三合一（攝影會/快閃/OFF）
//   node scripts/poster-shinohara-iyiyo.mjs --day 22   # 11/22 見面會
// 輸出：jching/data/shinohara-2026-11/iyo-11<day>.png
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { findEvent, toIntroEvent, parseArgs } from './jching-events.mjs';

const args = parseArgs();
const day = String(args.day || '21');
const ACTRESS_ID = '192328';

const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const fonts = [
  { name: 'Noto', data: readFileSync(`${D}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: 'Noto', data: readFileSync(`${D}/NotoSansTC-Bold.otf`), weight: 700 },
];
const C = {
  bg: '#F0F0D8', gold: '#F0C078', goldDk: '#E0A050', goldInk: '#7C5022',
  rose: '#C75B5B', roseDeep: '#A03E3E', roseBg: '#FBE6E6',
  ink: '#3D2B0A', sub: '#8A5A28', line: '#E0D3B0',
};
const REPO = '/Users/siulungchan/projects/JAVStar-data';
const PROMO = `${REPO}/public/actress-promos/${ACTRESS_ID}.jpg`;
const photo = existsSync(PROMO)
  ? `data:image/jpeg;base64,${readFileSync(PROMO).toString('base64')}` : null;

const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

// 每場活動嘅一列：左邊時間／類型 chip，右邊標題＋地點
const SessionRow = (time, title, note) =>
  h('div', {
    style: {
      display: 'flex', alignItems: 'flex-start', gap: 18,
      background: 'rgba(20,14,4,0.55)', border: `1.5px solid ${C.gold}`,
      borderRadius: 16, padding: '18px 22px',
    },
  },
    h('div', {
      style: {
        flexShrink: 0, minWidth: 132, padding: '8px 14px', borderRadius: 10,
        background: C.gold, color: '#1A1208', fontSize: 24, fontWeight: 700,
        textAlign: 'center', letterSpacing: 0.5,
      },
    }, time),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { fontSize: 30, fontWeight: 700, color: '#F0F0D8', letterSpacing: 1 } }, title),
      note ? h('div', { style: { fontSize: 20, fontWeight: 400, color: '#D8C8A8', lineHeight: 1.4 } }, note) : null,
    ),
  );

async function build(meta, sessions) {
  const W = 1080, H = 1350;
  const tree = h('div', {
    style: { width: W, height: H, position: 'relative', fontFamily: 'Noto', background: '#000', overflow: 'hidden' },
  },
    // 照片鋪滿
    photo
      ? h('img', { src: photo, width: W, height: H, style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover', objectPosition: 'top center' } })
      : h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#F0C078,#A87850)' } }),
    // 漸層 scrim
    h('div', {
      style: {
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
        background: 'linear-gradient(180deg, rgba(20,14,4,0.35) 0%, rgba(20,14,4,0.45) 30%, rgba(20,14,4,0.92) 100%)',
      },
    }),
    // 頂部 pill
    h('div', { style: { position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', padding: '10px 22px', borderRadius: 999, background: C.gold } },
      h('div', { style: { fontSize: 20, fontWeight: 700, color: '#1A1208', letterSpacing: 2 } }, 'JCHING 活動快訊')),
    h('div', { style: { position: 'absolute', top: 48, right: 56, padding: '10px 22px', borderRadius: 999, background: 'rgba(199,91,91,0.95)' } },
      h('div', { style: { fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 1 } }, meta.datePill)),

    // 底部內容
    h('div', { style: { position: 'absolute', left: 56, right: 56, bottom: 52, display: 'flex', flexDirection: 'column' } },
      h('div', { style: { fontSize: 54, fontWeight: 700, color: '#F0F0D8', letterSpacing: 2, lineHeight: 1.08 } }, meta.headline),
      h('div', { style: { fontSize: 38, fontWeight: 700, color: C.gold, letterSpacing: 6, marginTop: 14 } }, '篠原伊代 篠原いよ'),
      h('div', { style: { width: 72, height: 5, background: C.rose, borderRadius: 3, marginTop: 20 } }),

      // 場次列表
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 } },
        ...sessions.map((s) => SessionRow(s.time, s.title, s.note))),

      // 地點＋主辦
      h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 24, gap: 12 } },
        h('div', { style: { width: 6, height: 30, background: C.gold, borderRadius: 2, flexShrink: 0 } }),
        h('div', { style: { display: 'flex', flexDirection: 'column' } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: '#D8C8A8', letterSpacing: 3, marginBottom: 3 } }, 'VENUE 地點'),
          h('div', { style: { fontSize: 25, fontWeight: 700, color: '#F0F0D8', lineHeight: 1.3 } }, meta.venue))),
      h('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 22, paddingTop: 18, borderTop: `1.5px solid rgba(240,192,120,0.4)`,
        },
      },
        h('div', { style: { fontSize: 18, fontWeight: 400, color: '#D8C8A8' } }, '主辦 JAVStarMeet　·　資訊平台 JCHING'),
        h('div', { style: { fontSize: 20, fontWeight: 700, color: C.gold } }, '#JCHING')),
    ),
  );

  const svg = await satori(tree, { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const outDir = '/Users/siulungchan/.hermes/profiles/jching/data/shinohara-2026-11';
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `iyo-11${day}.png`);
  writeFileSync(out, png);
  console.log('saved', out, png.length, 'bytes, sessions:', sessions.length);
  return out;
}

if (day === '21') {
  // 三場同址，資料由 API 拉（確保同 DB 一致）
  const photo_ev = toIntroEvent(await findEvent({ eventId: 'javstar-192328-20261121-photo' }));
  const flash_ev = toIntroEvent(await findEvent({ eventId: 'javstar-192328-20261121-flash' }));
  const off_ev = toIntroEvent(await findEvent({ eventId: 'javstar-192328-20261121-off' }));
  await build(
    {
      datePill: '11.21（六）',
      headline: '香港粉絲活動日',
      venue: photo_ev.venue,
    },
    [
      { time: '12:00／13:50／17:30', title: '香港粉絲攝影會（C 位輪流）', note: '3 個獨立場次，每場約 12 人，含 Cheki 合照 2 張；17:30 為 VIP 場' },
      { time: '15:40–16:40', title: flash_ev.typeLabel, note: '鬧市突襲 1 小時，嚴格限定 25 人，獨立售票、不包於攝影會券' },
      { time: '19:00–22:00', title: off_ev.typeLabel + '（晚餐派對）', note: '限量 15 位，實名制，含 Cheki 合照 2 張＋親筆簽名 1 張' },
    ],
  );
} else if (day === '22') {
  const meet_ev = toIntroEvent(await findEvent({ eventId: 'javstar-192328-20261122-meet' }));
  await build(
    {
      datePill: '11.22（日）',
      headline: meet_ev.typeLabel,
      venue: meet_ev.venue,
    },
    [
      { time: '13:00–14:00', title: '見面會 第一場', note: '入場券 $100／位，遲開場半小時不得入場' },
      { time: '14:30–15:30', title: '見面會 第二場', note: '可加購合照／簽名／自拍／個人攝影等特典券' },
      { time: '16:30–17:30', title: '見面會 第三場', note: '唇印券全場限量 20 張、壁咚套餐 $599' },
      { time: '18:30–19:30', title: '見面會 第四場', note: '券僅限當日當場，不設退款' },
    ],
  );
} else {
  throw new Error('--day 只支援 21 或 22');
}
