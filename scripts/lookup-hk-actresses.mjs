#!/usr/bin/env node
// 透過 JCHING 公開 API 查 20 位女優嘅 actress id（quick search）
const BASE="https://j-star-data.vercel.app";
const names=["神木麗","青空光","瀧本雫葉","東條夏","伊藤舞雪","川越鈴子","友田彩也香","彩月七緒",
"栗山莉緒","桃園怜奈","明日葉三葉","村上悠華","吉澤友貴","白峰美羽","小梅惠奈","九野雛乃","北野未奈",
"初美菜乃花","香水純","谷梓"];

function norm(s){return (s||"").replace(/[\s（(].*$/,"").trim();}
const found={},missing=[];
for(const n of names){
  const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(n)}&limit=8`;
  try{
    const r=await fetch(u);const j=await r.json();
    const arr=j.data||[];
    // 精準 match name_cn 或 name_ja 嘅核心中文名
    const exact=arr.find(a=>norm(a.name_cn)===n||norm(a.name_ja)===n)||arr[0];
    if(exact)found[n]={id:exact.id,ja:exact.name_ja,cn:(exact.name_cn||"").slice(0,30),n:arr.length};
    else missing.push(n);
  }catch(e){missing.push(n+"(err)");}
  await new Promise(r=>setTimeout(r,250));
}
console.log("=== 找到 ===");
for(const [n,f] of Object.entries(found))console.log(`${n}\t${f.id}\t${f.ja}\t候選${f.n}`);
console.log("\n=== 找不到 ===");
console.log(missing.join("、")||"無");
