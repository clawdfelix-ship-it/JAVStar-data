#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
// [中文, 日文/別名 candidates]
const probe=[
 ["藍芽水月","藍芽みずき","藍芽水月"],
 ["惠理","めぐり","恵理","惠理"],
 ["鈴木真夕","鈴木真夕"],
 ["辻井穗乃果","辻井ほのか","辻井穗乃果"],
 ["吉岡日和","吉岡ひより","吉岡日和"],
 ["博多彩葉","博多つばき","博多彩葉"],
 ["坂井美櫻","坂井みお","坂井美桜","坂井美櫻"],
 ["蜜戀乃葉","蜜恋ののは","蜜戀乃葉"],
 ["彌生美月","弥生みづき","彌生美月"],
 ["八木奈奈","八木奈々","八木奈奈"],
 ["青空光","青空ひかり"],
 ["櫻桃空","桜羽のどか","樱桃空","櫻桃空"],
 ["乃南結一","乃南ゆい","乃南結一"],
 ["善場麻美","善場まみ","善場麻美"],
 ["福田悠亞","福田もあ","福田悠亜","福田悠亞"],
 ["三佳詩","三佳詩"],
 ["田野憂","田野憂"],
 ["冬愛琴音","冬愛ことね","冬愛琴音"],
];
const found=[],missing=[];
for(const row of probe){
  const cn=row[0];let hit=null;
  for(const term of row.slice(1)){
    const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(term)}&limit=8`;
    let j;try{j=await(await fetch(u)).json();}catch(e){continue;}
    const arr=j.data||[];
    const exact=arr.find(a=>(a.name_ja||"")===term||(a.name_cn||"").startsWith(cn)||(a.name_cn||"").includes(cn));
    if(exact){hit={term,id:exact.id,ja:exact.name_ja,cn:(exact.name_cn||"").slice(0,24)};break;}
    await new Promise(r=>setTimeout(r,180));
  }
  if(hit)found.push(`${cn}\t${hit.id}\t${hit.ja} (via ${hit.term})`);
  else missing.push(cn);
  await new Promise(r=>setTimeout(r,220));
}
console.log("=== 找到 ===");found.forEach(x=>console.log(x));
console.log("\n=== 庫中冇（要先建 actress 或唔入）===");
console.log(missing.join("、"));
