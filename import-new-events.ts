import sql from '@/lib/db';
import * as fs from 'fs';

// 讀取新抓取嘅活動
const rawEvents = JSON.parse(fs.readFileSync('./scraped-events-search.json', 'utf8'));

// 常見女優名 pattern：「さん」、「ちゃん」、日文名 + 空格
function extractActressName(eventName: string): string | null {
  // Pattern 1: 「XXさん」、「XXちゃん」
  const sanMatch = eventName.match(/([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,15})(さん|ちゃん)/);
  if (sanMatch) return sanMatch[1];

  // Pattern 2: 開頭係名，例如「7/4(土)12時~＆17時～渡来ふうイベント」
  const nameMatch = eventName.match(/[～~]([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,15})イベント/);
  if (nameMatch) return nameMatch[1];

  // Pattern 3: 直接係名，例如「竹内有紀ちゃん」
  const directMatch = eventName.match(/([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,15})[ちゃん|さん|イベント|オフ会]/);
  if (directMatch) return directMatch[1];

  return null;
}

// 標準化日期格式：2026/7/1 → 2026-07-01
function normalizeDate(dateStr: string): string {
  // 取第一行，去重複
  const clean = dateStr.split('\n')[0].trim();
  const parts = clean.split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return clean;
}

async function main() {
  console.log(`讀取到 ${rawEvents.length} 個新活動\n`);

  // 讀取所有女優，用來匹配
  const actresses = await sql`SELECT id, name_ja FROM actresses`;
  const actressMap = new Map((actresses as any[]).map(a => [a.name_ja, a.id]));

  console.log(`數據庫有 ${actressMap.size} 個女優\n`);

  let matched = 0;
  let notMatched = 0;
  let inserted = 0;
  let skipped = 0;

  for (const event of rawEvents) {
    const actressName = extractActressName(event.event_name);
    
    if (!actressName) {
      console.log(`❌ 無法提取女優名: ${event.event_name}`);
      notMatched++;
      continue;
    }

    // 精確匹配
    let actressId = actressMap.get(actressName);

    // 如果唔匹配，試下模糊匹配（包含）
    if (!actressId) {
      for (const [name, id] of actressMap.entries()) {
        if (name.includes(actressName) || actressName.includes(name)) {
          actressId = id;
          console.log(`🔍 模糊匹配: ${actressName} → ${name}`);
          break;
        }
      }
    }

    if (!actressId) {
      console.log(`❌ 找不到女優: ${actressName} (${event.event_name})`);
      notMatched++;
      continue;
    }

    matched++;

    // 檢查呢個 event 是否已存在
    const existing = await sql`SELECT id FROM events WHERE id = ${event.id}`;
    if ((existing as any[]).length > 0) {
      console.log(`⏭️  已存在，跳過: ${event.id} - ${actressName}`);
      skipped++;
      continue;
    }

    // 導入數據庫
    try {
      await sql`
        INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type, url, created_at)
        VALUES (
          ${event.id},
          ${actressId},
          ${event.event_name},
          ${event.location || ''},
          ${event.location || ''},
          ${normalizeDate(event.event_date)},
          ${'イベント'},
          ${event.url},
          NOW()
        )
      `;
      console.log(`✅ 導入成功: ${actressName} - ${event.event_date} - ${event.event_name}`);
      inserted++;
    } catch (e) {
      console.error(`❌ 導入失敗: ${event.id}`, e);
    }
  }

  console.log(`
--- 統計 ---
✅ 匹配成功: ${matched}
❌ 匹配失敗: ${notMatched}
🆕 新增活動: ${inserted}
⏭️  跳過重複: ${skipped}
  `);
}

main().catch(console.error);
