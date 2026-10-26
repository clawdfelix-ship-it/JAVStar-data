#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
async function get(u){return (await fetch(u)).json();}

// 1) 未來 HK
const up=(await get(`${BASE}/api/events?region=hk&limit=200`)).data||[];
const mine=up.filter(e=>(e.id||"").startsWith("javstar-hk-"));
console.log("=== 未來 HK（今日起）屬於本次匯入 ===",mine.length);
for(const e of mine.sort((a,b)=>a.date_iso.localeCompare(b.date_iso)))
  console.log(` ${e.date_iso} [${e.event_type}] ${e.title} | ${e.organizer}`);

// 2) 過去 HK（past=1）
const past=((await get(`${BASE}/api/events?region=hk&past=1&limit=2000`)).data||[])
  .filter(e=>(e.id||"").startsWith("javstar-hk-"));
console.log("\n=== 含歷史在內，本次 javstar-hk-* 總數 ===",past.length);

// 3) 抽查女優頁 upcoming：香水純(344949)、谷梓(88266)
for(const [n,id] of [["香水純","344949"],["谷梓","88266"],["伊藤舞雪","995886"]]){
  const d=(await get(`${BASE}/api/events?region=hk&limit=200`)).data||[];
  const list=d.filter(e=>String(e.actress_id)===id);
  console.log(`\n女優 ${n} 未來 HK 場: ${list.length}`);
  list.forEach(e=>console.log("   ",e.date_iso,e.event_type,e.title));
}
// 4) 型別/主辦統計（歷史全量）
const all=past;
const tc={},oc={};
for(const e of all){tc[e.event_type]=(tc[e.event_type]||0)+1;oc[e.organizer]=(oc[e.organizer]||0)+1;}
console.log("\n全部61場 類型:",JSON.stringify(tc),"主辦:",JSON.stringify(oc));
