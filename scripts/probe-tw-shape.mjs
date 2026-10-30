#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const ev=(await(await fetch(`${BASE}/api/events?region=taiwan&past=1&limit=2000`)).json()).data||[];
// 看有冇特殊 actress_id 佔位（非純數字 / 0 / unknown / group-*）
const ids={};
ev.forEach(e=>{ids[e.actress_id]=(ids[e.actress_id]||0)+1;});
console.log("actress_id 種類:");
Object.entries(ids).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,v])=>console.log("  ",JSON.stringify(k),v));
// event_type 分佈
const et={};ev.forEach(e=>et[e.event_type]=(et[e.event_type]||0)+1);
console.log("\nevent_type",et);
// 列出 all upcoming taiwan（現在之後）
const up=ev.filter(e=>e.date_iso>="2026-10-26");
console.log("\n台灣 upcoming",up.length);
up.sort((a,b)=>a.date_iso.localeCompare(b.date_iso)).slice(0,20).forEach(e=>console.log("  ",e.date_iso,e.actress_id,e.title));
