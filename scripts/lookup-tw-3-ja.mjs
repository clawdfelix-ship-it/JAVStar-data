#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
const terms=["蜜このは","このは","乃南ゆい","乃南","福田ゆあ","福田"];
const seen=new Set();
for(const term of terms){
  const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(term)}&limit=10`;
  const j=await(await fetch(u)).json();
  console.log(`\n[${term}] ${(j.data||[]).length}`);
  for(const a of (j.data||[])){
    const k=a.id+(a.name_ja||"");if(seen.has(a.id+a.name_ja))continue;
    console.log("  ",a.id,a.name_ja,"/",(a.name_cn||"").slice(0,36));
  }
  await new Promise(r=>setTimeout(r,200));
}
