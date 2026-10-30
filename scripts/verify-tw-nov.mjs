#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const ev=(await(await fetch(`${BASE}/api/events?region=taiwan&limit=2000`)).json()).data||[];
const mine=ev.filter(e=>(e.id||"").startsWith("javstar-tw-11")).sort((a,b)=>a.date_iso.localeCompare(b.date_iso));
console.log("11月台灣場(upcoming) 本次匯入:",mine.length);
for(const e of mine)console.log(` ${e.date_iso} ${e.prefecture} [${e.event_type}] ${e.title}`);
// 佔位女優有冇出現喺正常 actress 列表（用 events join 結果睇 name）
const grp=mine.filter(e=>String(e.actress_id)==="900000001");
console.log("\n展覽佔位事件:",grp.length,grp.map(g=>g.title.split("】")[0]+"】").join(" "));
// 女優頁抽查：田野憂 HAVEN、善場麻美高雄
for(const [n,id] of [["田野憂","163082"],["善場麻美","536708"]]){
  const x=mine.find(e=>String(e.actress_id)===id);
  console.log(n,"->",x?`${x.date_iso} ${x.prefecture} ${x.title}`:"缺");
}
