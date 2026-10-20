// 活動介紹海報 B + C
// B: 1080×1350 直向左右 split（雜誌感）
// C: 1080×1080 full-bleed 照片 + 底部漸層壓字
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { findEvent, toIntroEvent, parseArgs } from './jching-events.mjs';

const args = parseArgs();
// 同 A2 一樣由 JCHING API 搵場；預設鎖攝影會主場
const row = await findEvent({
  eventId: args['event-id'],
  actressId: args['actress-id'] || '192328',
  date: args.date || '2026-11-21',
  type: args.type || 'photo',
  titleHas: args['title-has'],
  base: args.base,
});
const ev0 = toIntroEvent(row);
const actressId = ev0.actressId;
const ev = { ...ev0, hashtag: `${ev0.hashtag}　#JCHING` };

const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const fonts = [
  { name:'Noto', data:readFileSync(`${D}/NotoSansTC-Regular.otf`), weight:400 },
  { name:'Noto', data:readFileSync(`${D}/NotoSansTC-Bold.otf`), weight:700 },
];
const C={bg:'#F0F0D8',gold:'#F0C078',goldDk:'#E0A050',goldInk:'#7C5022',
  rose:'#C75B5B',roseDeep:'#A03E3E',roseBg:'#FBE6E6',ink:'#3D2B0A',sub:'#8A5A28',line:'#E0D3B0'};

const REPO='/Users/siulungchan/projects/JAVStar-data';
const PROMO=`${REPO}/public/actress-promos/${actressId}.jpg`;
const photo = existsSync(PROMO)
  ? `data:image/jpeg;base64,${readFileSync(PROMO).toString('base64')}` : null;

const h=(t,p={},...c)=>({type:t,props:{...p,children:c.flat()}});

async function render(tree,W,H,out){
  const svg=await satori(tree,{width:W,height:H,fonts});
  const png=new Resvg(svg,{fitTo:{mode:'width',value:W}}).render().asPng();
  writeFileSync(out,png); console.log('saved',out,png.length);
}
const chip = (bg,ink)=>(ev.sessionsChip||ev.sessions)
  ? h('div',{style:{padding: bg===C.gold?'7px 18px':'6px 14px',borderRadius:bg===C.gold?9:8,background:bg,
      fontSize:bg===C.gold?19:17,fontWeight:700,color:ink,flexShrink:0}},ev.sessionsChip||'Special')
  : null;

// ============ B：1080×1350 直向 split ============
const WB=1080,HB=1350;
const treeB=h('div',{style:{width:WB,height:HB,background:C.bg,fontFamily:'Noto',
  display:'flex',flexDirection:'column'}},
  // masthead
  h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',
    marginTop:48,marginLeft:60,marginRight:60}},
    h('div',{style:{display:'flex',alignItems:'center'}},
      h('div',{style:{width:8,height:32,background:C.rose,borderRadius:2,marginRight:14}}),
      h('div',{style:{fontSize:20,fontWeight:700,color:C.goldInk,letterSpacing:3}},'JCHING 活動快訊')),
    h('div',{style:{fontSize:18,fontWeight:700,color:C.roseDeep}},ev.date),
  ),
  // 照片（直向，全寬金框，佔上 ~55%）
  h('div',{style:{margin:'30px 60px 0 60px',height:640,borderRadius:24,overflow:'hidden',
    border:`3px solid ${C.gold}`,background:'#000',flexShrink:0,
    boxShadow:'0 10px 30px rgba(124,80,34,0.18)'}},
    photo?h('img',{src:photo,width:960,height:640,style:{objectFit:'cover',objectPosition:'top center'}})
          :h('div',{style:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:160,color:C.gold}},(ev.actressJa||ev.actress||'?').slice(0,1))),
  // 標題
  h('div',{style:{marginLeft:60,marginTop:34}},
    h('div',{style:{display:'flex',alignItems:'center',gap:16}},
      h('div',{style:{fontSize:58,fontWeight:700,color:C.ink,letterSpacing:2,lineHeight:1}},ev.typeLabel),
      chip(C.rose,'#fff')),
    h('div',{style:{fontSize:40,fontWeight:700,color:C.goldInk,letterSpacing:5,marginTop:16}},ev.actress),
    ev.sessions?h('div',{style:{fontSize:22,fontWeight:400,color:C.sub,marginTop:8}},ev.sessions):null,
  ),
  h('div',{style:{margin:'26px 60px 0 60px',height:2,background:C.line}}),
  // 資料
  h('div',{style:{marginLeft:60,marginRight:60,marginTop:24,display:'flex',flexDirection:'column',gap:20}},
    [['DATE 日期',ev.date],['VENUE 地點',ev.venue],['ORGANIZER 主辦',ev.org]].map(([l,v])=>
      h('div',{style:{display:'flex',alignItems:'center'}},
        h('div',{style:{width:6,height:42,background:C.rose,borderRadius:2,marginRight:18,flexShrink:0}}),
        h('div',{style:{display:'flex',flexDirection:'column'}},
          h('div',{style:{fontSize:14,fontWeight:700,color:C.sub,letterSpacing:3,marginBottom:4}},l),
          h('div',{style:{fontSize:28,fontWeight:700,color:C.ink}},v))))),
  // footer
  h('div',{style:{marginTop:'auto',marginLeft:60,marginRight:60,marginBottom:44,display:'flex',
    justifyContent:'space-between',alignItems:'center',paddingTop:20,borderTop:`2px solid ${C.line}`}},
    h('div',{style:{fontSize:18,fontWeight:700,color:C.roseDeep}},ev.hashtag),
    h('div',{style:{fontSize:16,fontWeight:400,color:C.sub}},'資訊平台 JCHING')),
);
await render(treeB,WB,HB,`/Users/siulungchan/.hermes/profiles/it/cache/scratch/l2_event_intro_B_${actressId}_${row.id}.png`);

// ============ C：1080×1080 full-bleed 壓字 ============
const WS=1080,HS=1080;
const treeC=h('div',{style:{width:WS,height:HS,position:'relative',fontFamily:'Noto',
  background:'#000',overflow:'hidden'}},
  // 照片鋪滿
  photo?h('img',{src:photo,width:WS,height:HS,style:{position:'absolute',top:0,left:0,objectFit:'cover',objectPosition:'top center'}})
       :h('div',{style:{position:'absolute',inset:0,background:'linear-gradient(160deg,#F0C078,#A87850)'}}),
  // 底部黑金漸層 scrim（由透明到實，高度 46%）
  h('div',{style:{position:'absolute',left:0,right:0,bottom:0,height:500,
    background:'linear-gradient(180deg, rgba(20,14,4,0) 0%, rgba(20,14,4,0.55) 35%, rgba(20,14,4,0.92) 100%)'}}),
  // 頂部 pill
  h('div',{style:{position:'absolute',top:48,left:56,display:'flex',alignItems:'center',
    padding:'9px 20px',borderRadius:999,background:C.gold}},
    h('div',{style:{fontSize:19,fontWeight:700,color:'#1A1208',letterSpacing:2}},'JCHING 活動快訊')),
  h('div',{style:{position:'absolute',top:48,right:56,padding:'9px 20px',borderRadius:999,
    background:'rgba(199,91,91,0.95)'}},
    h('div',{style:{fontSize:19,fontWeight:700,color:'#fff',letterSpacing:1}},ev.date)),
  // 底部文字
  h('div',{style:{position:'absolute',left:56,right:56,bottom:56,display:'flex',flexDirection:'column'}},
    h('div',{style:{display:'flex',alignItems:'center',gap:14}},
      h('div',{style:{fontSize:56,fontWeight:700,color:'#F0F0D8',letterSpacing:2,lineHeight:1}},ev.typeLabel),
      chip(C.gold,'#1A1208')),
    h('div',{style:{fontSize:34,fontWeight:700,color:C.gold,letterSpacing:5,marginTop:12}},ev.actress),
    h('div',{style:{width:64,height:4,background:C.rose,borderRadius:2,marginTop:18}}),
    h('div',{style:{display:'flex',alignItems:'center',marginTop:16}},
      h('div',{style:{width:6,height:28,background:C.gold,borderRadius:2,marginRight:12,flexShrink:0}}),
      h('div',{style:{display:'flex',flexDirection:'column'}},
        h('div',{style:{fontSize:12,fontWeight:700,color:'#D8C8A8',letterSpacing:3,marginBottom:2}},'VENUE 地點'),
        h('div',{style:{fontSize:24,fontWeight:700,color:'#F0F0D8'}},ev.venue))),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:22}},
      h('div',{style:{fontSize:18,fontWeight:400,color:'#D8C8A8'}},'主辦 '+ev.org+'　·　資訊平台 JCHING'),
      h('div',{style:{fontSize:17,fontWeight:700,color:C.gold}},'#JCHING')),
  ),
);
await render(treeC,WS,HS,`/Users/siulungchan/.hermes/profiles/it/cache/scratch/l2_event_intro_C_${actressId}_${row.id}.png`);
