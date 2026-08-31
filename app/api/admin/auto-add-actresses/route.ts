import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

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
    .replace(/\d{1,2}\/\d{1,2}/g, ' ')          // 移除 4/18 這種日期
    .replace(/\d{1,2}:\d{2}[〜~\-]?/g, ' ')   // 移除時間
    .replace(/\d{1,2}月\d{1,2}日/g, ' ')      // 移除 4月11日
    .replace(/\d{1,2}月/g, ' ')               // 移除 4月
    .trim();
  
  // 拆分常見分隔詞
  const tokens = cleaned.split(/\s+|[♡★☆・＠@！!？?、。\,\.]/);
  
  // 過濾噪音詞（大幅擴充）
  const noiseWords = [
    // 活動類型
    'イベント', 'イベント！', 'サイン会', 'サイン', 'コラボ', 'デビュー',
    '撮影会', 'チェキ', 'お渡し', 'リリース', '会', '会場',
    'バースデー', '生誕祭', 'パチンコ來店', '來店', 'DVD',
    '入学シーズン', '春のパンツ祭', 'スペシャル', 'Special',
    // 地名 / 場所
    '秋葉原', '新宿', '渋谷', '池袋', '大阪', '名古屋', '仙台', '神戸', '群馬県',
    '大宮', '岡山', '大阪市', 'in', 'at', 'と', 'に', 'で', 'へ',
    'MAX書店', 'ラムタラ', 'パラダイスBOX', 'エピカリアキバ', 'エピカリアアキバ',
    'わんぱく', 'アキバCollab', 'Collab', 'Time',
    // 公司 / 廠牌
    '專属', 'FALENO', 'SODSTAR', 'SOD', 'プレステージ', 'プラネットプラス',
    'アイポケ', 'アイポケット', 'MOODYZ', 'Madonna', 'ナチュラルハイ', 'ナチュラルハイアワード',
    'チキチキカマー', 'チキリバ', 'ゲスト',
    // 狀態
    '開催', '開催決定', '記念', '年間ベスト', '2025', '2026', '完売',
    '様', 'さん', 'ちゃん', '君', 'さま',
    // 時間
    '土', '日', '月', '火', '水', '木', '金', '土曜日', '日曜日',
    // 贅詞
    '夜', '周', 'Akiba', 'アキバ', 'りん', '中', '部',
    // 口語
    '「', '」', '『', '』', '゜', '・',
    // 進一步
    '主催', 'スター', 'STAR', '詳細', '依頬', '各部', '限定',
    '天然美', 'BODY', 'ビキニ', '秘密基地', 'てんちゃん',
  ];
  
  // 日本女優名稱特徵檢測
  // 可接受：
  // 1. 純漢字 (如：河北彩伽)
  // 2. 純仮名 (如：あかねり、ララ)
  // 3. 漢字+仮名混合 (如：八掛うみ)
  // 4. 全英文 (如：RARA、miru)
  function looksLikeName(s: string): boolean {
    // 長度限制
    if (s.length < 2 || s.length > 10) return false;
    // 不能包含數字
    if (/\d/.test(s)) return false;
    // 不能全是符號
    if (/^[　\s、。・～〜]+$/.test(s)) return false;
    // 不能包含頯點符號
    if (/[!?！？@＠#$%^&*]/.test(s)) return false;
    
    // 全英文（二次元女優如 RARA, miru）
    if (/^[A-Za-z]+$/.test(s) && s.length >= 2) return true;
    
    // 含日文字符（漢字、仮名）
    const hasJapanese = /[一-鿿぀-ゟ゠-ヿ]/.test(s);
    if (!hasJapanese) return false;
    
    // 不能包含英文與日文混合 (避免 Akiba、SODSTAR 之類)
    const hasEnglish = /[A-Za-z]/.test(s);
    if (hasEnglish) return false;
    
    return true;
  }
  
  for (const token of tokens) {
    let t = token.replace(/様$|さん$|ちゃん$|君$/g, '').trim();
    if (!t) continue;
    
    // 检查是否是噪音詞
    if (noiseWords.includes(t)) continue;
    if (noiseWords.some(w => t === w)) continue;
    
    // 检查是否看起來像名字
    if (!looksLikeName(t)) continue;
    
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
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

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

    // 4. 提取所有候選女優名 (閾值調高: 需出現 ≥2 次)
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

    // 5. 過濾：只保留出現 ≥2 次的候選（出現一次可能是雜訊）
    const newActresses: Array<{
      name: string;
      count: number;
      sampleEvents: string[];
      generatedId: string;
    }> = [];

    for (const [name, info] of candidateMap.entries()) {
      if (info.count >= 2) {  // 至少出現 2 次才算有效女優
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
