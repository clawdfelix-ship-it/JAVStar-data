#!/usr/bin/env node
const BASE="https://j-star-data.vercel.app";
// 缺嘅 10 位：中文名 + 日文/假名/別名
const probe=[
 ["青空光","青空ひかり"],
 ["東條夏","東條なつ"],
 ["川越鈴子","川越にこ","川越リコ"],
 ["明日葉三葉","明日葉みつは"],
 ["白峰美羽","白峰ミウ"],
 ["小梅惠奈","小梅えな"],
 ["九野雛乃","九野ひなの"],
 ["初美菜乃花","初美なのか"],
 ["香水純","香水じゅん"],
 ["谷梓","谷あづさ"],
];
for(const row of probe){
  const cn=row[0];
  let hit=null;
  for(const term of row){
    const u=`${BASE}/api/actresses?mode=quick&search=${encodeURIComponent(term)}&limit=8`;
    const j=await(await fetch(u)).json();
    const arr=j.data||[];
    const exact=arr.find(a=>(a.name_ja||"").includes(term)||(a.name_cn||"").includes(cn));
    if(exact){hit={term,id:exact.id,ja:exact.name_ja,cn:exact.name_cn};break;}
    await new Promise(r=>setTimeout(r,200));
  }
  console.log(cn, hit?`-> ${hit.id} ${hit.ja} (via ${hit.term})`:"❌ 真係冇，要新入 actresses");
  await new Promise(r=>setTimeout(r,250));
}
