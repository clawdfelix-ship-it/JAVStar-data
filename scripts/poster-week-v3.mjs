// 週曆 v3 — flexbox 真排版（杜絕 overlap），embed Noto Sans TC
// 每條事件列 = flex row：日期欄(固定) | 軸點 | 女優(flex) | 主辦(flex) | 類型(固定) | 城市(固定右)
// satori 用 Yoga engine，flex 會自動分配寬度，唔靠估字寬
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const D = '/Users/siulungchan/.hermes/profiles/it/cache/scratch';
const fonts = [
  { name: 'Noto', data: readFileSync(`${D}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: 'Noto', data: readFileSync(`${D}/NotoSansTC-Bold.otf`), weight: 700 },
];
const W = 1080, H = 1080;
const C = {
  bg:'#F0F0D8', gold:'#F0C078', goldLine:'#E0A050', goldInk:'#7C5022',
  rose:'#C75B5B', roseDeep:'#A03E3E', roseBg:'#FBE6E6',
  ink:'#3D2B0A', sub:'#8A5A28', muted:'#6E6048', line:'#E0D3B0', dotEmpty:'#CDBF9E',
};

const days = [
  { md:'10/19', wd:'一', evs:[] },
  { md:'10/20', wd:'二', evs:[] },
  { md:'10/21', wd:'三', evs:[] },
  { md:'10/22', wd:'四', evs:[] },
  { md:'10/23', wd:'五', evs:[
      {a:'辻井ほのか', org:'女優下班後', city:'台北', kind:'攝影會'},
      {a:'愛弓りょう',   org:'女優下班後', city:'台北', kind:'攝影會'},
  ]},
  { md:'10/24', wd:'六', evs:[
      {a:'一乃あおい', org:'ace',      city:'台北', kind:'見面會'},
      {a:'百永さりな', org:'MaisonX',  city:'台北', kind:'攝影會'},
      {a:'中山ふみか', org:'野人文庫', city:'台北', kind:'見面會'},
      {a:'吉澤友貴',   org:'12the',    city:'高雄', kind:'見面會'},
  ]},
  { md:'10/25', wd:'日', evs:[] },
];

const h = (t,p={},...c)=>({type:t,props:{...p,children:c.flat()}});

// 一條事件列（flex row，軸點居中）
const EventRow = e =>
  h('div',{style:{display:'flex',alignItems:'center',height:54}},
    // 軸點
    h('div',{style:{width:36,display:'flex',justifyContent:'center',flexShrink:0}},
      h('div',{style:{width:14,height:14,borderRadius:999,background:C.rose,
        border:`3px solid ${C.bg}`}})),
    // 女優（固定寬 250，唔縮）
    h('div',{style:{width:252,fontSize:26,fontWeight:700,color:C.ink,flexShrink:0}},e.a),
    // 主辦（彈性，最小寬）
    h('div',{style:{flex:'1 1 0',fontSize:17,fontWeight:400,color:C.sub,
      overflow:'hidden',whiteSpace:'nowrap'}},e.org),
    // 類型 chip（固定 96）
    h('div',{style:{width:104,display:'flex',justifyContent:'center',flexShrink:0}},
      h('div',{style:{padding:'4px 0',width:96,textAlign:'center',borderRadius:8,
        background:C.roseBg,border:`1.5px solid ${C.rose}`,
        fontSize:16,fontWeight:700,color:C.roseDeep}},e.kind)),
    // 城市（固定 72 右對齊）
    h('div',{style:{width:72,textAlign:'right',fontSize:23,fontWeight:700,
      color:C.goldInk,flexShrink:0}},e.city),
  );

// 空列
const EmptyRow = () =>
  h('div',{style:{display:'flex',alignItems:'center',height:40}},
    h('div',{style:{width:36,display:'flex',justifyContent:'center',flexShrink:0}},
      h('div',{style:{width:10,height:10,borderRadius:999,background:C.dotEmpty}})),
    h('div',{style:{fontSize:18,fontWeight:400,color:C.muted}},'港台暫無場次'),
  );

// 一日 = flex row：左日期欄 + 右事件區
const DayRow = d =>
  h('div',{style:{display:'flex'}},
    // 日期欄（固定寬，內容右對齊 + 軸點 36）
    h('div',{style:{display:'flex',alignItems: d.evs.length?'flex-start':'center'}},
      h('div',{style:{
        width:120,display:'flex',flexDirection:'column',alignItems:'flex-end',
        paddingRight:10, ...(d.evs.length?{marginTop:6}:{}),
      }},
        h('div',{style:{fontSize:29,fontWeight:700,lineHeight:1.1,
          color:d.evs.length?C.roseDeep:C.muted}},d.md),
        h('div',{style:{fontSize:15,fontWeight:400,color:d.evs.length?C.sub:C.muted,marginTop:3}},
          `週${d.wd}`),
      ),
    ),
    // 事件欄（flex column，內含 row；第一個 row 嘅軸點對日期）
    h('div',{style:{flex:'1 1 0',display:'flex',flexDirection:'column'}},
      d.evs.length ? d.evs.map(EventRow) : h(EmptyRow),
    ),
  );

// 表頭列（對齊各欄，留返日期欄 120 + 軸 36 = 156 嘅 offset）
const HeadCell = (w,t,extra={}) =>
  h('div',{style:{width:w,fontSize:13,fontWeight:700,color:C.muted,letterSpacing:2,
    textAlign:extra.align||'left',flexShrink:0}},t);

const HeaderRow = () =>
  h('div',{style:{display:'flex',paddingLeft:56}},
    h('div',{style:{width:120,flexShrink:0}}),  // 日期欄留白
    h('div',{style:{width:36,flexShrink:0}}),   // 軸留白
    HeadCell(252,'女優'),
    h('div',{style:{flex:'1 1 0'}}),             // 主辦欄彈性
    h('div',{style:{width:104,textAlign:'center',fontSize:13,fontWeight:700,
      color:C.muted,letterSpacing:2,flexShrink:0}},'類型'),
    HeadCell(72,'城市',{align:'right'}),
  );

const tree = h('div',{style:{width:W,height:H,background:C.bg,fontFamily:'Noto',
  display:'flex',flexDirection:'column',position:'relative'}},

  // masthead（左對齊）
  h('div',{style:{display:'flex',alignItems:'center',marginTop:52,marginLeft:56}},
    h('div',{style:{width:8,height:40,background:C.rose,borderRadius:2,marginRight:16}}),
    h('div',{style:{fontSize:19,fontWeight:700,color:C.roseDeep,letterSpacing:2}},
      '2026.10.19 — 10.25　港台場週曆'),
  ),
  h('div',{style:{marginLeft:56,marginTop:12,fontSize:60,fontWeight:700,
    color:C.goldInk,letterSpacing:3,lineHeight:1}},'本週女優活動'),
  h('div',{style:{marginLeft:56,marginTop:12,fontSize:21,fontWeight:400,color:C.sub}},
    '香港 · 台灣共 6 場　·　台北 5　·　高雄 1'),

  // 表頭
  h('div',{style:{marginTop:34,paddingRight:56}},
    h(HeaderRow)),

  // 時間軸 + 日子（用一條獨立垂直線疊喺軸點中心）
  h('div',{style:{flex:'1 1 0',display:'flex',flexDirection:'column',
    marginTop:10,marginLeft:56,marginRight:56,position:'relative'}},
    // 垂直線：左 offset = 日期120 + 軸中心(18) - 線半寬(1.5)
    h('div',{style:{position:'absolute',left:136.5,top:8,bottom:8,width:3,
      background:`linear-gradient(180deg, ${C.goldLine}, ${C.gold})`,
      borderRadius:2,opacity:.5}}),
    days.map(DayRow),
  ),

  // footer
  h('div',{style:{display:'flex',flexDirection:'column',
    marginLeft:56,marginRight:56,marginBottom:34,paddingTop:16,
    borderTop:`2px solid ${C.line}`,gap:10}},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
      h('div',{style:{fontSize:16,fontWeight:400,color:C.sub}},
        '資訊平台 JCHING　·　各場主辦方見標註'),
      h('div',{style:{fontSize:16,fontWeight:700,color:C.roseDeep}},'#JCHING'),
    ),
    h('div',{style:{display:'flex',justifyContent:'center',
      padding:'8px 16px',borderRadius:999,background:C.roseBg,
      border:`1.5px solid ${C.rose}`}},
      h('div',{style:{fontSize:17,fontWeight:700,color:C.roseDeep,letterSpacing:1}},
        '如有更多活動，歡迎提供資訊')),
  ),
);

const svg = await satori(tree,{width:W,height:H,fonts});
const png = new Resvg(svg,{fitTo:{mode:'width',value:W}}).render().asPng();
const out = process.argv[2] || '/Users/siulungchan/.hermes/profiles/it/cache/scratch/l2_week_oct19_25_v3.png';
writeFileSync(out,png);
console.log('saved',out,png.length);
