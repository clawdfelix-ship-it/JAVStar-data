#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const up=(await(await fetch(`${BASE}/api/events?region=hk&limit=2000`)).json()).data||[];
const mine=up.filter(e=>(e.id||"").startsWith("javstar-hk-"));
// 新批 id 含 202612 / 202701
const dec=mine.filter(e=>/-(202612|202701)/.test(e.id)).sort((a,b)=>a.date_iso.localeCompare(b.date_iso)||a.event_type.localeCompare(b.event_type));
console.log("新批(12月+1月) upcoming 場次:",dec.length);
const byDate={};for(const e of dec)(byDate[e.date_iso]??=[]).push(`${e.event_type}:${e.title}`);
for(const d of Object.keys(byDate).sort()){console.log(`\n${d} (${byDate[d].length})`);byDate[d].forEach(t=>console.log("  "+t));}
// 女優頁抽查
for(const [n,id] of [["MINAMO","876195"],["JULIA","305758"]]){
  const list=up.filter(e=>String(e.actress_id)===id&&/-(202612|202701)/.test(e.id));
  console.log(`\n${n} 新批 upcoming:`,list.map(e=>`${e.date_iso}${e.event_type[0]}`).join(","));
}
