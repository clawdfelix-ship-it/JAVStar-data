// 活動介紹海報 A2 — 左字右圖 split，1080×1080
// 右圖直向長方形（face-aware），左欄 editorial 文字；flex 排版唔 overlap、embed Noto
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { findEvent, toIntroEvent, parseArgs } from './jching-events.mjs';

const args = parseArgs();
const outArg = args._[0];

// 資料源：JCHING API 一場活動。
// 鎖定：--event-id（最穩）或 --actress-id 192328 --date 2026-11-21 --type photo
//       或 --title-has 旺角快閃
// 完整地址/場次摘要 API 冇，放 ~/.config/jching-poster.json（唔入 repo）
const row = await findEvent({
  eventId: args['event-id'],
  actressId: args['actress-id'] || '192328',
  date: args.date || '2026-11-21',
  type: args.type || 'photo',
  titleHas: args['title-has'],
  base: args.base,
});
const ev = toIntroEvent(row);
const actressId = ev.actressId;

const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const fonts = [
  { name:'Noto', data:readFileSync(`${D}/NotoSansTC-Regular.otf`), weight:400 },
  { name:'Noto', data:readFileSync(`${D}/NotoSansTC-Bold.otf`), weight:700 },
];
const W=1080,H=1080;
const C={bg:'#F0F0D8',gold:'#F0C078',goldDk:'#E0A050',goldInk:'#7C5022',
  rose:'#C75B5B',roseDeep:'#A03E3E',roseBg:'#FBE6E6',ink:'#3D2B0A',sub:'#8A5A28',line:'#E0D3B0'};

// talent 半身宣傳相：用 sharp 預裁好 face-centered 直向 474×1000（scripts/precrop-portrait.mjs）
// 相路徑跟 JCHING actress_id，唔再 hardcode
const REPO='/Users/siulungchan/projects/JAVStar-data';
const PRE=`${D}/promo_${actressId}_portrait.jpg`;
const RAW=`${REPO}/public/actress-promos/${actressId}.jpg`;
const photo = existsSync(PRE)
  ? `data:image/jpeg;base64,${readFileSync(PRE).toString('base64')}`
  : existsSync(RAW) ? `data:image/jpeg;base64,${readFileSync(RAW).toString('base64')}` : null;

const h=(t,p={},...c)=>({type:t,props:{...p,children:c.flat()}});

const InfoRow=(label,value)=>
  h('div',{style:{display:'flex',alignItems:'center',minHeight:60}},
    h('div',{style:{width:5,height:40,background:C.rose,borderRadius:2,marginRight:14,flexShrink:0}}),
    h('div',{style:{display:'flex',flexDirection:'column'}},
      h('div',{style:{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:3,marginBottom:3}},label),
      h('div',{style:{fontSize:21,fontWeight:700,color:C.ink,letterSpacing:0.5}},value)));

const tree=h('div',{style:{width:W,height:H,background:C.bg,fontFamily:'Noto',
  display:'flex',flexDirection:'row'}},

  // ===== 左欄：文字 =====
  h('div',{style:{width:566,display:'flex',flexDirection:'column',
    paddingTop:50,paddingBottom:40,paddingLeft:52,paddingRight:22}},

    h('div',{style:{display:'flex',alignItems:'center'}},
      h('div',{style:{width:7,height:30,background:C.rose,borderRadius:2,marginRight:12}}),
      h('div',{style:{fontSize:18,fontWeight:700,color:C.goldInk,letterSpacing:3}},'JCHING 活動快訊')),
    h('div',{style:{alignSelf:'flex-start',marginTop:16,padding:'7px 16px',borderRadius:999,
      background:C.rose,fontSize:17,fontWeight:700,color:'#fff',letterSpacing:1}},ev.date),

    h('div',{style:{marginTop:30,fontSize:48,fontWeight:700,color:C.ink,
      letterSpacing:1,lineHeight:1.14}},ev.typeLabel),
    h('div',{style:{marginTop:14,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}},
      h('div',{style:{fontSize:33,fontWeight:700,color:C.goldInk,letterSpacing:4}},ev.actress),
      ev.sessions ? h('div',{style:{padding:'4px 11px',borderRadius:7,background:C.gold,
        fontSize:14,fontWeight:700,color:'#3D2B0A'}},ev.sessionsChip || 'Special') : null),
    ev.sessions ? h('div',{style:{marginTop:8,fontSize:18,fontWeight:400,color:C.sub}},ev.sessions) : null,

    h('div',{style:{marginTop:24,height:2,background:C.line,borderRadius:1}}),

    h('div',{style:{marginTop:16,display:'flex',flexDirection:'column'}},
      InfoRow('DATE 日期',ev.date),
      InfoRow('VENUE 地點',ev.venue),
      InfoRow('ORGANIZER 主辦',ev.org)),

    h('div',{style:{marginTop:'auto',display:'flex',flexDirection:'column'}},
      h('div',{style:{alignSelf:'flex-start',padding:'8px 16px',borderRadius:999,
        background:C.roseBg,border:`1.5px solid ${C.rose}`,
        fontSize:15,fontWeight:700,color:C.roseDeep,marginBottom:12}},'如有更多活動，歡迎提供資訊'),
      h('div',{style:{fontSize:16,fontWeight:700,color:C.roseDeep,letterSpacing:0.5}},ev.hashtag),
      h('div',{style:{fontSize:14,fontWeight:400,color:C.sub,marginTop:2}},'資訊平台 JCHING')),
  ),

  // ===== 右欄：直向長方形圖片（明確 474×1000，face-aware）=====
  h('div',{style:{display:'flex',paddingTop:40,paddingRight:40,paddingBottom:40}},
    h('div',{style:{width:474,height:1000,borderRadius:24,overflow:'hidden',
      border:`3px solid ${C.gold}`,background:'#000',flexShrink:0,
      boxShadow:'0 12px 34px rgba(124,80,34,0.22)'}},
      photo
        ? h('img',{src:photo,width:474,height:1000,
            style:{objectFit:'fill',objectPosition:'center'}})
        : h('div',{style:{width:474,height:1000,display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:140,color:C.gold}},(ev.actressJa||ev.actress||'?').slice(0,1))),
  ),
);

const svg=await satori(tree,{width:W,height:H,fonts});
const png=new Resvg(svg,{fitTo:{mode:'width',value:W}}).render().asPng();
const out=outArg||`/Users/siulungchan/.hermes/profiles/it/cache/scratch/l2_event_intro_${actressId}_${row.id}.png`;
writeFileSync(out,png);
console.log('saved',out,png.length,'event:',row.id,'photo:',photo?'promo':'fallback');
