#!/usr/bin/env node
// 2026 Dec / 2027 Jan Sixtoys 香港場 -> JCHING events-upsert manifest
import { writeFileSync } from 'node:fs';
const AID={
 "MINAMO":"876195","白上咲花":"646601","神宮寺奈緒":"211419",
 "JULIA":"305758","小花暖":"354337","天神羽衣":"594097","本庄鈴":"493582",
};
// [date, actress, label, type]
const rows=[
 // MINAMO
 ["2026-12-05","MINAMO","見面會","meet"],["2026-12-05","MINAMO","攝影會","photo"],
 ["2026-12-06","MINAMO","見面會","meet"],["2026-12-06","MINAMO","攝影會","photo"],
 // 白上咲花
 ["2026-12-12","白上咲花","見面會","meet"],["2026-12-12","白上咲花","攝影會","photo"],
 ["2026-12-13","白上咲花","見面會","meet"],["2026-12-13","白上咲花","攝影會","photo"],
 // 神宮寺奈緒
 ["2026-12-25","神宮寺奈緒","見面會","meet"],["2026-12-25","神宮寺奈緒","攝影會","photo"],
 ["2026-12-26","神宮寺奈緒","見面會","meet"],["2026-12-26","神宮寺奈緒","攝影會","photo"],
];
// CMORE 感謝祭 4 藝人 × 2 日 × (見面會+攝影會)
for(const d of ["2027-01-09","2027-01-10"]){
  for(const a of ["JULIA","小花暖","天神羽衣","本庄鈴"]){
    rows.push([d,a,"CMORE感謝祭 見面會","meet"]);
    rows.push([d,a,"CMORE感謝祭 攝影會","photo"]);
  }
}
const seen=new Set();const events=[];
for(const [date,act,label,type] of rows){
  const aid=AID[act];if(!aid){console.error("缺id",act);process.exit(1);}
  const day=date.replaceAll("-","");
  const key0=`${day}-${aid}-${type}`;
  let n=1,id=`javstar-hk-${key0}-${n}`;
  while(seen.has(id)){n++;id=`javstar-hk-${key0}-${n}`;}
  seen.add(id);
  events.push({id,actress_id:aid,title:`${act} ${label}（Sixtoys）`,date,
    prefecture:"香港",venue:"",event_type:type,url:"",organizer:"community"});
}
writeFileSync(new URL('./hk-dec-manifest.json',import.meta.url),JSON.stringify(events,null,2));
const by={};for(const e of events)(by[e.date]??=[]).push(e);
console.log("總筆數",events.length);
for(const d of Object.keys(by).sort()){
  console.log(`\n${d} (${by[d].length})`);
  for(const e of by[d])console.log(`  [${e.event_type}] ${e.title} #${e.actress_id}`);
}
