#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const probe=[
 ["MINAMO","MINAMO","みなも"],
 ["白上咲花","白上咲花","白上さきか"],
 ["神宮寺奈緒","神宮寺奈緒","神宮寺ナオ"],
 ["JULIA","JULIA","ジュリア"],
 ["小花暖","小花暖","小花のん"],
 ["天神羽衣","天神羽衣","天神うい"],
 ["本庄鈴","本庄鈴","本庄すず"],
];
for(const row of probe){
  const cn=row[0];let hit=null,tried=[];
  for(const term of row.slice(1)){
    tried.push(term);
    const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(term)}&limit=8`;
    let j;try{j=await(await fetch(u)).json();}catch(e){continue;}
    const arr=j.data||[];
    const exact=arr.find(a=>(a.name_ja||"")===term||(a.name_cn||"").includes(cn)||(a.name_ja||"").includes(term));
    if(exact){hit={term,id:exact.id,ja:exact.name_ja,cn:(exact.name_cn||"").slice(0,28)};break;}
    await new Promise(r=>setTimeout(r,200));
  }
  console.log(cn.padEnd(8), hit?`-> ${hit.id}  ${hit.ja} / ${hit.cn} (via ${hit.term})`:`❌ 庫中冇（試過 ${tried.join(",")}）`);
  await new Promise(r=>setTimeout(r,250));
}
