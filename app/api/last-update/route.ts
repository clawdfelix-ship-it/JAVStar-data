import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 取最新的時間：活動創建/更新時間 或 女優更新時間
    const [eventResult, actressResult] = await Promise.all([
      sql`SELECT GREATEST(MAX(created_at), MAX(updated_at)) as last_update FROM events`,
      sql`SELECT MAX(updated_at) as last_update FROM actresses`
    ]);
    
    const eventLastUpdate = Array.isArray(eventResult) && eventResult.length > 0 
      ? (eventResult[0] as any)?.last_update 
      : null;
    const actressLastUpdate = Array.isArray(actressResult) && actressResult.length > 0 
      ? (actressResult[0] as any)?.last_update 
      : null;
    
    // 取最新的那個時間
    const dates = [new Date(eventLastUpdate || 0), new Date(actressLastUpdate || 0), new Date()];
    const lastUpdate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return NextResponse.json({
      last_update: lastUpdate.toISOString(),
      timezone: 'UTC',
      event_last_update: eventLastUpdate,
      actress_last_update: actressLastUpdate
    });
  } catch (error) {
    console.error('[last-update] DB error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Database error', detail: message }, { status: 500 });
  }
}
