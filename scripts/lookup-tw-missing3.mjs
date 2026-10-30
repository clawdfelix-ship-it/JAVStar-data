#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const probe=[
 ["蜜戀乃葉",["蜜戀ののは","蜜恋ののは","ののは","蜜戀","Miren Nonoha"]],
 ["乃南結一",["乃南ゆい","乃南結衣","南ゆい","Yui Noami"]],
 ["福田悠亞",["福田もあ","福田桃亜","福田Moa","ふくだもあ"]],
];
for(const [cn,terms] of probe){
  let hit=null;
  for(const term of terms){
    const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(term)}&limit=10`;
    let j;try{j=await(await fetch(u)).json();}catch(e){continue;}
    const arr=j.data||[];
    if(arr.length){
      // 列出候選人，唔自動當中
      console.log(`\n${cn} 查「${term}」-> ${arr.length} 候選:`);
      arr.slice(0,6).forEach(a=>console.log("   ",a.id,a.name_ja,"/",(a.name_cn||"").slice(0,30)));
      hit=hit||arr;
    }
    await new Promise(r=>setTimeout(r,180));
  }
  if(!hit)console.log(`\n${cn}: 完全冇候選`);
}
