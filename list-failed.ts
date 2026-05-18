import * as fs from 'fs';

const events6 = JSON.parse(fs.readFileSync('./scraped-events-search.json', 'utf8'));

async function main() {
  // 獲取已導入活動 ID
  const eventsRes = await fetch('https://jav-star-data.vercel.app/api/events?limit=2000');
  const eventsData = await eventsRes.json();
  const importedIds = new Set((eventsData.data || []).map((e: any) => e.id));
  
  // 篩選未導入嘅
  const failed = events6.filter((e: any) => !importedIds.has(e.id));
  
  console.log(`\n========== 失敗活動完整列表 (${failed.length} 個) ==========\n`);
  
  failed.forEach((e: any, i: number) => {
    console.log(`${i + 1}. [${e.event_date.split('\n')[0].trim()}] ${e.event_name}`);
    console.log(`   📍 ${e.location}  🔗 ${e.url}`);
  });

  // 寫入 JSON 文件方便處理
  fs.writeFileSync('./failed-events.json', JSON.stringify(failed, null, 2));
  console.log(`\n✅ 已保存到 failed-events.json (${failed.length} 個)`);
}

main().catch(console.error);
