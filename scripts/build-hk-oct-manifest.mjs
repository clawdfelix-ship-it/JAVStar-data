#!/usr/bin/env node
// 生成 10月香港活動 manifest -> 印出 + 存 JSON。乾跑用，唔寫 DB。
// id 前綴 javstar-hk-  ；organizer: javstarmeet 自家，其餘 community（合作夥伴）
const fs=await import('node:fs');
const AID={ // 中文名 -> JCHING actress id
 "神木麗":"671983","青空光":"380512","瀧本雫葉":"428088","東條夏":"156423","伊藤舞雪":"995886",
 "川越鈴子":"67059","友田彩也香":"21903","彩月七緒":"908789","栗山莉緒":"811420","桃園怜奈":"989925",
 "明日葉三葉":"377441","村上悠華":"370864","吉澤友貴":"199557","白峰美羽":"795049","小梅惠奈":"7513",
 "九野雛乃":"24741","北野未奈":"759593","初美菜乃花":"968795","香水純":"344949","谷梓":"88266",
};
// 每筆: [日期, 女優, 主辦(英文key), 主辦顯示名, 場次label, type]
// type: photo=攝影會 meet=見面會 other=OFF/簽名/水晶巴士/攝影展
const rows=[
 // 10-03
 ["2026-10-03","神木麗","soxsocks","Soxsocks","品牌聯乘活動","other"],
 ["2026-10-03","青空光","soxsocks","Soxsocks","品牌聯乘活動","other"],
 ["2026-10-03","瀧本雫葉","sixtoy","Sixtoy","見面會","meet"],
 ["2026-10-03","東條夏","yoru","Yoru+","攝影會","photo"],
 ["2026-10-03","東條夏","yoru","Yoru+","見面會","meet"],
 ["2026-10-03","伊藤舞雪","javstarmeet","JavStarMeet","攝影會 & OFF 會","photo"],
 ["2026-10-03","伊藤舞雪","javstarmeet","JavStarMeet","見面會","meet"],
 // 10-04
 ["2026-10-04","東條夏","yoru","Yoru+","攝影會","photo"],
 ["2026-10-04","東條夏","yoru","Yoru+","見面會","meet"],
 ["2026-10-04","伊藤舞雪","javstarmeet","JavStarMeet","攝影會 & OFF 會","photo"],
 ["2026-10-04","伊藤舞雪","javstarmeet","JavStarMeet","見面會","meet"],
 // 10-10
 ["2026-10-10","川越鈴子","konger","Konger","攝影會 & OFF 會","photo"],
 ["2026-10-10","川越鈴子","konger","Konger","見面會","meet"],
 ["2026-10-10","友田彩也香","sixtoy","Sixtoy","見面會","meet"],
 ["2026-10-10","友田彩也香","sixtoy","Sixtoy","攝影會","photo"],
 // 10-11
 ["2026-10-11","川越鈴子","konger","Konger","攝影會 & OFF 會","photo"],
 ["2026-10-11","川越鈴子","konger","Konger","見面會","meet"],
 ["2026-10-11","友田彩也香","sixtoy","Sixtoy","見面會","meet"],
 ["2026-10-11","友田彩也香","sixtoy","Sixtoy","攝影會","photo"],
 // 10-16
 ["2026-10-16","彩月七緒","community","","攝影展 & 簽名會","other"],
 // 10-17
 ["2026-10-17","栗山莉緒","yoru","Yoru+","攝影會","photo"],
 ["2026-10-17","栗山莉緒","yoru","Yoru+","見面會","meet"],
 ["2026-10-17","桃園怜奈","yoru","Yoru+","攝影會","photo"],
 ["2026-10-17","桃園怜奈","yoru","Yoru+","見面會","meet"],
 ["2026-10-17","明日葉三葉","sixtoy","Sixtoy","見面會","meet"],
 ["2026-10-17","村上悠華","konger","Konger","攝影會","photo"],
 ["2026-10-17","村上悠華","konger","Konger","水晶巴士之旅","other"],
 ["2026-10-17","村上悠華","konger","Konger","見面會","meet"],
 ["2026-10-17","吉澤友貴","fanzo","Fanzo","見面會","meet"],
 ["2026-10-17","吉澤友貴","fanzo","Fanzo","攝影會 & OFF 會","photo"],
 // 10-18
 ["2026-10-18","栗山莉緒","yoru","Yoru+","攝影會","photo"],
 ["2026-10-18","栗山莉緒","yoru","Yoru+","見面會","meet"],
 ["2026-10-18","桃園怜奈","yoru","Yoru+","攝影會","photo"],
 ["2026-10-18","桃園怜奈","yoru","Yoru+","見面會","meet"],
 ["2026-10-18","村上悠華","konger","Konger","攝影會","photo"],
 ["2026-10-18","村上悠華","konger","Konger","水晶巴士之旅","other"],
 ["2026-10-18","村上悠華","konger","Konger","見面會","meet"],
 ["2026-10-18","吉澤友貴","fanzo","Fanzo","見面會","meet"],
 ["2026-10-18","吉澤友貴","fanzo","Fanzo","攝影會 & OFF 會","photo"],
 // 10-24
 ["2026-10-24","白峰美羽","konger","Konger","攝影會","photo"],
 ["2026-10-24","白峰美羽","konger","Konger","見面會 & OFF 會","meet"],
 ["2026-10-24","小梅惠奈","fanzo","Fanzo","見面會","meet"],
 ["2026-10-24","小梅惠奈","fanzo","Fanzo","攝影會 & OFF 會","photo"],
 ["2026-10-24","九野雛乃","sixtoy","Sixtoy","見面會","meet"],
 ["2026-10-24","北野未奈","yoru","Yoru+","攝影會","photo"],
 ["2026-10-24","北野未奈","yoru","Yoru+","見面會","meet"],
 ["2026-10-24","初美菜乃花","hikari","Project Hikari","見面會","meet"],
 ["2026-10-24","初美菜乃花","hikari","Project Hikari","攝影會","photo"],
 // 10-25
 ["2026-10-25","白峰美羽","konger","Konger","攝影會","photo"],
 ["2026-10-25","白峰美羽","konger","Konger","見面會 & OFF 會","meet"],
 ["2026-10-25","小梅惠奈","fanzo","Fanzo","見面會","meet"],
 ["2026-10-25","小梅惠奈","fanzo","Fanzo","攝影會 & OFF 會","photo"],
 ["2026-10-25","北野未奈","yoru","Yoru+","攝影會","photo"],
 ["2026-10-25","北野未奈","yoru","Yoru+","見面會","meet"],
 ["2026-10-25","初美菜乃花","hikari","Project Hikari","見面會","meet"],
 ["2026-10-25","初美菜乃花","hikari","Project Hikari","攝影會","photo"],
 // 10-31
 ["2026-10-31","香水純","konger","Konger","攝影會","photo"],
 ["2026-10-31","香水純","konger","Konger","見面會","meet"],
 ["2026-10-31","谷梓","sixtoy","Sixtoy","見面會","meet"],
 // 11-01
 ["2026-11-01","香水純","konger","Konger","攝影會","photo"],
 ["2026-11-01","香水純","konger","Konger","見面會","meet"],
];

const TYPE_LABEL={photo:"攝影會",meet:"見面會",other:"活動"};
const events=[];const seen=new Set();
const slugCnt={};
for(const [date,act,orgKey,orgName,label,type] of rows){
  const aid=AID[act];
  if(!aid){console.error("缺 actress id:",act);process.exit(1);}
  const org = orgKey==="javstarmeet" ? "javstarmeet" : "community";
  const day=date.slice(5).replace("-","");
  // 純 ASCII id：日期-actress-type-同日序號
  const key0=`${day}-${aid}-${type}`;
  const seq=(slugCnt[key0]=(slugCnt[key0]||0)+1);
  let id=`javstar-hk-${key0}-${seq}`;
  if(seen.has(id)){console.error("id 撞:",id);process.exit(1);}
  seen.add(id);
  const host = org==="javstarmeet" ? "" : (orgName?`（${orgName}）`:"");
  const title=`${act} ${label}${host}`;
  events.push({id,actress_id:aid,title,date,prefecture:"香港",venue:"",
    event_type:type,url:"",organizer:org});
}
fs.writeFileSync(new URL('./hk-oct-manifest.json',import.meta.url),JSON.stringify(events,null,2));
// 報告
const byDate={};for(const e of events){(byDate[e.date]??=[]).push(e);}
console.log("總筆數:",events.length);
for(const d of Object.keys(byDate).sort()){
  console.log(`\n${d}  (${byDate[d].length}場)`);
  for(const e of byDate[d])console.log(`  [${e.event_type.padEnd(5)}] ${e.organizer==="javstarmeet"?"自家":"合作"} ${e.title}  #${e.actress_id}`);
}
const types={};events.forEach(e=>types[e.event_type]=(types[e.event_type]||0)+1);
console.log("\n類型分佈:",JSON.stringify(types));
console.log("自家:",events.filter(e=>e.organizer==="javstarmeet").length," 合作:",events.filter(e=>e.organizer==="community").length);
