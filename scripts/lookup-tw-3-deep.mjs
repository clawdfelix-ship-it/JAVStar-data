#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const probe=[
 ["蜜戀乃葉",["蜜恋ののは","みつれんののは","Mitsuren Nonoha","ののは","Nonoha","蜜戀","蜜恋"]],
 ["乃南結一",["乃南ゆい","のなみゆい","Nonami Yui","乃南","結一","ゆい"]],
 ["福田悠亞",["福田もあ","ふくだもあ","Fukuda Moa","福田","もあ","Moa"]],
];
for(const [cn,terms] of probe){
  console.log("\n========== "+cn);
  const seen=new Set();
  for(const term of terms){
    const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(term)}&limit=10`;
    let j;try{j=await(await fetch(u)).json();}catch(e){continue;}
    for(const a of (j.data||[])){
      if(seen.has(a.id))continue;seen.add(a.id);
      console.log(`  [${term}] ${a.id}  ${a.name_ja} / ${(a.name_cn||"").slice(0,40)}`);
    }
    await new Promise(r=>setTimeout(r,180));
  }
}
