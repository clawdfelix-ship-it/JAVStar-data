#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
// 1) 找有冇「活動/展覽/感謝祭/節」類 placeholder 女優
for(const q of ["活動","展覽","感謝祭","綜合","企劃","イベント"]){
  const j=await(await fetch(`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(q)}&limit=6`)).json();
  console.log(`[${q}]`,(j.data||[]).map(a=>`${a.id}:${a.name_ja}`).join("  ")||"—");
  await new Promise(r=>setTimeout(r,150));
}
// 2) 現有台灣場（含過去）睇 organizer/標題慣例，尤其非單一女優
const ev=(await(await fetch(`${BASE}/api/events?region=taiwan&past=1&limit=2000`)).json()).data||[];
console.log("\n台灣場總數(含歷史)",ev.length);
const weird=ev.filter(e=>/展|感謝祭|祭|Cosforce|TCE|博覽|卡牌|活動/.test(e.title||""));
console.log("含展/祭字眼",weird.length);
weird.slice(0,15).forEach(e=>console.log("  ",e.date_iso,e.actress_id,e.title,"|",e.organizer,"|",e.event_type));
