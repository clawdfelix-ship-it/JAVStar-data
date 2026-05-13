import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/scrape-actress-from-url
 * 從活動頁 URL 反向爬取女優詳情，自動新增到數據庫
 * 
 * 用法：
 *   POST /api/admin/scrape-actress-from-url
 *   body: { event_url: "https://www.av-event.jp/event/12345/" }
 * 
 *   GET /api/admin/scrape-actress-from-url?event_id=12345
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    
    if (!eventId) {
      return NextResponse.json({ 
        error: '請提供 event_id 參數',
        usage: 'GET /api/admin/scrape-actress-from-url?event_id=12345'
      }, { status: 400 });
    }
    
    // 1. 從數據庫查活動
    const events = await sql`SELECT id, url, title, actress_id FROM events WHERE id = ${eventId}` as any[];
    if (events.length === 0) {
      return NextResponse.json({ error: '活動不存在' }, { status: 404 });
    }
    
    const event = events[0];
    
    // 2. 爬取活動頁面，提取女優資訊
    const url = event.url || `https://www.av-event.jp/event/${eventId}/`;
    
    const html = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }).then(r => r.text());
    
    // 3. 解析 HTML 提取女優名（簡易正則）
    // av-event.jp 常見格式：女優名連結
    const actressMatches = [
      ...html.matchAll(/<a[^>]+href="\/actress\/(\d+)\/"[^>]*>([^<]+)<\/a>/g),
      ...html.matchAll(/<dd[^>]*class="[^"]*actress[^"]*"[^>]*>([^<]+)<\/dd>/gi),
    ];
    
    const foundActresses: Array<{ id?: string; name: string }> = [];
    
    for (const match of actressMatches) {
      if (match[2]) {
        // 第一種模式：有 ID 和姓名
        foundActresses.push({ id: match[1], name: match[2].trim() });
      } else if (match[1]) {
        // 第二種模式：只有姓名
        foundActresses.push({ name: match[1].trim() });
      }
    }
    
    // 4. 對找到的女優，檢查是否已在數據庫
    const allActresses = await sql`SELECT id, name_ja FROM actresses` as any[];
    const existingIds = new Set(allActresses.map((a: any) => a.id));
    const existingNames = new Set(allActresses.map((a: any) => a.name_ja?.toLowerCase()));
    
    const added: any[] = [];
    const matched: any[] = [];
    
    for (const found of foundActresses) {
      if (found.id && existingIds.has(found.id)) {
        matched.push({ ...found, status: 'already_exists' });
      } else if (existingNames.has(found.name.toLowerCase())) {
        matched.push({ ...found, status: 'name_exists' });
      } else {
        // 新女優！自動加入
        const newId = found.id || `auto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        try {
          await sql`
            INSERT INTO actresses (id, name_ja, created_at, updated_at)
            VALUES (${newId}, ${found.name}, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
          `;
          added.push({ ...found, newId });
          
          // 同時更新該活動的 actress_id
          await sql`UPDATE events SET actress_id = ${newId} WHERE id = ${eventId}`;
        } catch (err) {
          console.error('Insert error:', err);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        url,
        currentActressId: event.actress_id,
      },
      foundActresses,
      added,
      matched,
      durationMs: duration,
      summary: {
        message: `從活動頁找到 ${foundActresses.length} 個女優，新增 ${added.length} 個`,
      },
    });
    
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: '爬取失敗', details: String(error) },
      { status: 500 }
    );
  }
}
