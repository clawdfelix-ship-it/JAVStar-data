/**
 * 導入爬取嘅活動到數據庫
 * 用法：DATABASE_URL=postgres://... npx tsx import-scraped-events.ts
 */
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

// Better actress name extraction
function extractActressName(title: string): string {
  // Remove leading date patterns
  let clean = title
    .replace(/^[\d\/]+[\.月]?[\(（]?[金土日月火水木][^\)）]*[\)）]?/, '')
    .replace(/^[0-9]+月[0-9]+日[\(（]?[金土日月火水木][^\)）]*[\)）]?/, '')
    .trim();
  
  // Extract actress name (Japanese chars before ちゃん/さん/san)
  const m = clean.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,20})(ちゃん|san|さん|嬢|先生)/);
  if (m) return m[1];
  
  // Fallback: first 2+ Japanese chars
  const first = clean.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,})/);
  if (first) return first[1];
  
  return clean.split(/\s+/)[0];
}

// 標準化日期格式：2026/5/29 → 2026-05-29
function normalizeDate(dateStr: string): string {
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
  if (!process.env.DATABASE_URL) {
    console.error('❌ 請設置 DATABASE_URL 環境變量');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const events = JSON.parse(fs.readFileSync('scraped-events-search.json', 'utf8'));
  
  console.log(`讀取到 ${events.length} 個活動\n`);
  
  // 讀取所有女優，用來匹配
  const actresses = await sql`SELECT id, name_ja, name_cn FROM actresses`;
  console.log(`數據庫有 ${actresses.length} 個女優\n`);
  
  // Build fuzzy match map (partial match)
  const actressMap = new Map((actresses as any[]).map(a => [a.name_ja, a.id]));
  
  let matched = 0;
  let notMatched = 0;
  let inserted = 0;
  let skipped = 0;
  
  const unmatchedNames: string[] = [];
  
  for (const event of events) {
    const actressName = extractActressName(event.event_name);
    
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
      unmatchedNames.push(actressName);
      continue;
    }
    
    matched++;
    
    // 檢查呢個 event 是否已存在
    const existing = await sql`SELECT id FROM events WHERE id = ${event.id}`;
    if (existing.length > 0) {
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
    } catch (e: any) {
      console.error(`❌ 導入失敗: ${event.id}`, e.message);
    }
  }
  
  console.log(`
--- 統計 ---
✅ 匹配成功: ${matched}
❌ 匹配失敗: ${notMatched}
🆕 新增活動: ${inserted}
⏭️  跳過重複: ${skipped}
  `);
  
  if (unmatchedNames.length > 0) {
    console.log('\n找不到嘅女優名：');
    console.log([...new Set(unmatchedNames)].slice(0, 20).join('\n'));
  }
}

main().catch(console.error);
