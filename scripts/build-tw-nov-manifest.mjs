#!/usr/bin/env node
// 2026 台灣 11 月場。慣例：每女優整個檔期一筆，標題【主辦】女優 內容（M/D-M/D）。
// event_type：含攝影會->photo；見面會/店長->meet；展覽->other。
// prefecture：善場麻美=高雄，其餘台北。乃南結一(庫中無)跳過。
import { writeFileSync } from 'node:fs';
const GROUP_ID="900000001"; // 待建佔位女優「綜合活動」
// [startDate, endDate, actress_cn, actress_id, organizer, 內容, prefecture, type]
const rows=[
 ["2026-11-06","2026-11-08","惠理","19506","Foraver","一般攝影會","台北","photo"],
 ["2026-11-07","2026-11-07","藍芽水月","301341","Sweet Magic","私服攝影會","台北","photo"],
 ["2026-11-07","2026-11-08","鈴木真夕","839164","大人國","主題攝影會・遊戲派對・互動會・晚餐會","台北","photo"],
 ["2026-11-13","2026-11-15","辻井穗乃果","12539","Foraver","一般攝影會","台北","photo"],
 ["2026-11-14","2026-11-15","吉岡日和","655303","Secret9","攝影會・見面會・餐會","台北","photo"],
 ["2026-11-20","2026-11-22","博多彩葉","993545","Foraver","一般攝影會","台北","photo"],
 ["2026-11-21","2026-11-22","坂井美櫻","522290","女神超連結","攝影會・聖誕節派對・婚禮體驗日（與蜜戀乃葉合場）","台北","photo"],
 ["2026-11-21","2026-11-22","蜜このは","283996","女神超連結","攝影會・聖誕節派對・婚禮體驗日（與坂井美櫻合場）","台北","photo"],
 ["2026-11-21","2026-11-22","彌生美月","272417","野人文庫","攝影會・見面會・餐會","台北","photo"],
 ["2026-11-21","2026-11-22","八木奈奈","800245","HAVEN TOKYO","見面會・攝影會・私密會","台北","photo"],
 ["2026-11-21","2026-11-22","青空光","380512","AV8D","攝影會・見面會・餐會","台北","photo"],
 ["2026-11-21","2026-11-22","櫻桃空","835158","心碎小狗","一日店長見面會・快樂午宴","台北","meet"],
 ["2026-11-21","2026-11-22","善場麻美","536708","12the","初見特典會・互動見面會・女神晚宴・早午餐約會・攝影會（高雄場）","高雄","photo"],
 ["2026-11-27","2026-11-29","福田悠亞","293077","Foraver","一般攝影會","台北","photo"],
 ["2026-11-27","2026-11-29","三佳詩","901313","未來飛翔","攝影會・粉絲見面會","台北","photo"],
 ["2026-11-28","2026-11-29","田野憂","163082","HAVEN TOKYO","見面會・攝影會・私密會","台北","photo"],
 ["2026-11-28","2026-11-29","冬愛琴音","576418","跳進兔子洞","攝影會・小惡魔互動即售會・晚餐會","台北","photo"],
 // 大型綜合活動（佔位女優）
 ["2026-11-06","2026-11-08","Cosforce05制服狂熱互動寫真展",GROUP_ID,"Cosforce","Cosplay 攝影＆互動專展","台北","other"],
 ["2026-11-07","2026-11-08","TOP女神感謝祭",GROUP_ID,"TOP女神感謝祭","2026 秋冬場 TOP 女神感謝祭","台北","other"],
 ["2026-11-14","2026-11-15","TCE台灣卡牌展覽會",GROUP_ID,"TCE","舞台表演・棚拍製卡・女神告白室・繪師卡專屬簽名會・團拆見面會","台北","other"],
];
const md=d=>d.slice(5).replace("-","/");
const events=[];
for(const [start,end,name,aid,org,content,pref,type] of rows){
  const span=start===end?md(start):`${md(start)}-${md(end)}`;
  const title=`【${org}】${name} ${content}（${span}）`;
  const id=aid===GROUP_ID
    ? `javstar-tw-${start.slice(5).replace("-","")}-grp-${org.toLowerCase().replace(/[^a-z0-9]+/g,"")}`
    : `javstar-tw-${start.slice(5).replace("-","")}-${aid}`;
  events.push({id,actress_id:String(aid),title,date:start,prefecture:pref,
    venue:"",event_type:type,url:"",organizer:org,needsPlaceholder:aid===GROUP_ID});
}
const solo=events.filter(e=>!e.needsPlaceholder),grp=events.filter(e=>e.needsPlaceholder);
writeFileSync(new URL('./hk-tw-nov-manifest.json',import.meta.url),JSON.stringify(events,null,2));
console.log("單人場",solo.length,"筆（可即入）；綜合展覽",grp.length,"筆（待建佔位女優 "+GROUP_ID+"）\n");
for(const e of events)console.log(`${e.date} [${e.event_type}] ${e.prefecture} ${e.title}`);
