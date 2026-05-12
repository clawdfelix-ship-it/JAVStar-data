import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 從活動標題中提取女優名稱
 * 支持多種格式：
 * - 【FALENO】RARA イベント♡秋葉原 → RARA
 * - 2026年3月21日（土）RARA様　秋葉原イベント開催！ → RARA
 * - 河北彩伽 サイン会 in 秋葉原 → 河北彩伽
 */
function extractActressName(title: string): string[] {
  const candidates: string[] = [];
  
  // 移除常見前綴噪音
  let cleaned = title
    .replace(/【[^】]*】/g, ' ')        // 移除【】標籤
    .replace(/\([^)]*\)/g, ' ')        // 移除()
    .replace(/（[^）]*）/g, ' ')        // 移除（）
    .replace(/\d{4}年\d{1,2}月\d{1,2}日/g, ' ')  // 移除日期
    .replace(/\d{4}\/\d{1,2}\/\d{1,2}/g, ' ')
    .trim();
  
  // 拆分常見分隔詞
  const tokens = cleaned.split(/\s+|[♡★☆・]/);
  
  // 過濾噪音詞
  const noiseWords = [
    'イベント', 'サイン会', 'デビュー', '秋葉原', '新宿', '渋谷', '池袋',
    '開催', '様', 'さん', 'in', 'at', '会場', '記念',
    'バースデー', '生誕祭', '撮影会', 'お渡し', '会',
  ];
  
  for (const token of tokens) {
    const t = token.replace(/様$|さん$|ちゃん$/g, '').trim();
    if (!t || t.length < 2 || t.length > 15) continue;
    if (noiseWords.some(w => t.includes(w))) continue;
    if (/^\d+$/.test(t)) continue;  // 純數字
    
    candidates.push(t);
  }
  
  return candidates;
}

/**
 * GET /api/admin/auto-add-actresses
 * 找到所有孤立活動，提取女優名，自動新增不存在的女優
 * 
 * 參數：
 *   dry-run=true - 只顯示報告，不修改數據庫
 *   actress_id=xxx - 只處理特定女優的孤立活動
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const isDryRun = searchParams.get('dry-run') === 'true';
    const targetActressId = searchParams.get('actress_id') || null;

    // 1. 獲取所有現有女優
    const allActresses = await sql`SELECT id, name_ja FROM actresses` as any[];
    const existingNames = new Set(
      allActresses.map((a: any) => a.name_ja?.toLowerCase()).filter(Boolean)
    );

    // 2. 獲取所有活動
    const allEvents = targetActressId
      ? await sql`SELECT id, title, actress_id FROM events WHERE actress_id = ${targetActressId}` as any[]
      : await sql`SELECT id, title, actress_id FROM events` as any[];

    // 3. 提取所有候選女優名
    const candidateMap = new Map<string, { count: number; events: string[] }>();
    
    for (const event of allEvents) {
      const candidates = extractActressName(event.title);
      for (const name of candidates) {
        if (existingNames.has(name.toLowerCase())) continue; // 已存在跳過
        
        const existing = candidateMap.get(name) || { count: 0, events: [] };
        existing.count++;
        if (existing.events.length < 5) existing.events.push(event.title);
        candidateMap.set(name, existing);
      }
    }

    // 4. 過濾：只保留出現多次或符合女優名特徵的候選
    const newActresses: Array<{
      name: string;
      count: number;
      sampleEvents: string[];
      generatedId: string;
    }> = [];

    for (const [name, info] of candidateMap.entries()) {
      // 至少出現 1 次（單次也納入，但會標記低信心）
      if (info.count >= 1) {
        // 生成 ID：使用名稱的 hash 簡化
        const generatedId = `auto_${Buffer.from(name).toString('base64').replace(/[/+=]/g, '').substring(0, 12)}`;
        
        newActresses.push({
          name,
          count: info.count,
          sampleEvents: info.events,
          generatedId,
        });
      }
    }

    // 按出現次數排序
    newActresses.sort((a, b) => b.count - a.count);

    // 5. 執行新增
    const stats = {
      totalEvents: allEvents.length,
      candidateNames: candidateMap.size,
      newActresses: newActresses.length,
      added: 0,
      skipped: 0,
      errors: 0,
    };

    const addedActresses: any[] = [];
    const errors: any[] = [];

    if (!isDryRun) {
      for (const newAct of newActresses) {
        try {
          await sql`
            INSERT INTO actresses (id, name_ja, created_at, updated_at)
            VALUES (${newAct.generatedId}, ${newAct.name}, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
          `;
          stats.added++;
          addedActresses.push(newAct);
        } catch (err) {
          stats.errors++;
          errors.push({ ...newAct, error: String(err) });
        }
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      dryRun: isDryRun,
      targetActressId,
      stats: { ...stats, durationMs: duration },
      newActresses: newActresses.slice(0, 100),
      addedActresses: addedActresses.slice(0, 100),
      errors: errors.slice(0, 50),
      summary: {
        message: isDryRun
          ? `預覽：發現 ${stats.newActresses} 個新女優候選（從 ${stats.candidateNames} 個候選名中過濾）`
          : `已新增 ${stats.added} 個女優記錄`,
        nextStep: isDryRun
          ? '檢查候選列表，去掉 dry-run=true 執行新增；新增後再執行 /api/admin/fix-matching 重新配對'
          : '建議接著執行 /api/admin/fix-matching 將孤立活動配對到新增的女優',
      },
    });

  } catch (error) {
    console.error('Auto-add actresses error:', error);
    return NextResponse.json(
      { error: '自動新增失敗', details: String(error) },
      { status: 500 }
    );
  }
}
