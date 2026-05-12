import sql from '@/lib/db';
import { findBestMatchingActress, validateActressEventMatch } from '@/lib/matching-validator';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/fix-matching - 一鍵修復活動配對
// 參數：
//   dry-run=true - 只顯示報告，不修改數據庫
//   actress_id=xxx - 只修復特定女優
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const isDryRun = searchParams.get('dry-run') === 'true';
    const targetActressId = searchParams.get('actress_id') || null;
    const deleteOrphans = searchParams.get('delete-orphans') === 'true';

    // 1. 獲取所有女優
    const allActresses = await sql`SELECT id, name_ja, name_cn FROM actresses` as any[];
    
    // 2. 獲取所有活動（或特定女優的活動）
    const allEvents = targetActressId
      ? await sql`SELECT id, title, actress_id FROM events WHERE actress_id = ${targetActressId}` as any[]
      : await sql`SELECT id, title, actress_id FROM events` as any[];

    // 3. 構建女優 ID 到姓名的映射
    const actressMap = new Map(
      allActresses.map((a: any) => [a.id, a])
    );

    // 4. 掃描每個活動，檢查配對
    const stats = {
      total: allEvents.length,
      valid: 0,
      mismatched: 0,
      fixed: 0,
      cannotFix: 0,
      deleted: 0,
    };

    const mismatchedEvents: any[] = [];
    const fixedEvents: any[] = [];
    const deletedEvents: any[] = [];
    const errors: any[] = [];

    for (const event of allEvents) {
      const currentActress = actressMap.get(event.actress_id);
      
      if (!currentActress) {
        stats.cannotFix++;
        errors.push({
          eventId: event.id,
          eventTitle: event.title,
          reason: `女優 ID ${event.actress_id} 不存在`,
        });
        continue;
      }

      // 檢查當前配對是否有效
      const validation = validateActressEventMatch(
        event.title,
        currentActress.name_ja,
        currentActress.name_cn
      );

      if (validation.isValid) {
        stats.valid++;
        continue;
      }

      // 配對錯誤，尋找正確的女優
      stats.mismatched++;
      const bestMatch = findBestMatchingActress(event.title, allActresses);

      const mismatchInfo = {
        eventId: event.id,
        eventTitle: event.title,
        currentActressId: event.actress_id,
        currentActressName: currentActress.name_ja,
        suggestedActressId: bestMatch.suggestedActressId,
        suggestedActressName: bestMatch.suggestedActressName,
        confidence: bestMatch.confidence,
      };

      mismatchedEvents.push(mismatchInfo);

      // 如果找到了高置信度的匹配，執行修復
      if (bestMatch.confidence >= 50 && bestMatch.suggestedActressId) {
        if (!isDryRun) {
          try {
            await sql`
              UPDATE events 
              SET actress_id = ${bestMatch.suggestedActressId}
              WHERE id = ${event.id}
            `;
            stats.fixed++;
            fixedEvents.push(mismatchInfo);
          } catch (err) {
            errors.push({
              ...mismatchInfo,
              error: String(err),
            });
          }
        }
      } else {
        // 低置信度無法修復 - 如果設了 delete-orphans=true 則刪除
        stats.cannotFix++;
        if (deleteOrphans && !isDryRun) {
          try {
            await sql`DELETE FROM events WHERE id = ${event.id}`;
            stats.deleted++;
            deletedEvents.push(mismatchInfo);
          } catch (err) {
            errors.push({
              ...mismatchInfo,
              error: `Delete failed: ${String(err)}`,
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      dryRun: isDryRun,
      targetActressId,
      stats: {
        ...stats,
        durationMs: duration,
      },
      mismatchedEvents: mismatchedEvents.slice(0, 100), // 最多返回 100 個
      fixedEvents: fixedEvents.slice(0, 100),
      deletedEvents: deletedEvents.slice(0, 100),
      errors: errors.slice(0, 50),
      summary: {
        message: isDryRun 
          ? `預覽完成：發現 ${stats.mismatched} 個錯配，可修復 ${stats.mismatched - stats.cannotFix} 個${deleteOrphans ? `，可刪除 ${stats.cannotFix} 個孤立活動` : ''}`
          : `修復完成：已修正 ${stats.fixed} 個錯配活動${deleteOrphans ? `，已刪除 ${stats.deleted} 個孤立活動` : ''}`,
        nextStep: isDryRun
          ? '如果結果滿意，去掉 dry-run=true 參數執行實際修復；加上 delete-orphans=true 可一併刪除無法修復的孤立活動'
          : '修復完成，建議重新檢查女優頁面確認數據正確',
      },
    });

  } catch (error) {
    console.error('Fix matching error:', error);
    return NextResponse.json(
      { error: '修復失敗', details: String(error) },
      { status: 500 }
    );
  }
}
