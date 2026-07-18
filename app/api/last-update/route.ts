import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 每張表對應嘅時間戳欄位（events 只有 created_at，其餘有齊 created_at + updated_at）
async function maxTs(table: 'events' | 'actresses' | 'dvd_ranking' | 'new_releases'): Promise<string | null> {
  try {
    let result: any;
    if (table === 'events') {
      // events 冇 updated_at
      result = await sql`SELECT MAX(created_at) AS last_update FROM events`;
    } else if (table === 'actresses') {
      result = await sql`SELECT GREATEST(MAX(created_at), MAX(updated_at)) AS last_update FROM actresses`;
    } else if (table === 'dvd_ranking') {
      result = await sql`SELECT GREATEST(MAX(created_at), MAX(updated_at)) AS last_update FROM dvd_ranking`;
    } else {
      result = await sql`SELECT GREATEST(MAX(created_at), MAX(updated_at)) AS last_update FROM new_releases`;
    }
    return Array.isArray(result) && result.length > 0 ? (result[0] as any)?.last_update ?? null : null;
  } catch (e) {
    // 某張表唔存在 / 冇該欄位都唔應該打殘成個 endpoint
    console.error(`[last-update] table ${table} query failed:`, e);
    return null;
  }
}

export async function GET() {
  try {
    const [eventTs, actressTs, dvdTs, releasesTs] = await Promise.all([
      maxTs('events'),
      maxTs('actresses'),
      maxTs('dvd_ranking'),
      maxTs('new_releases'),
    ]);

    const parsedDates = [eventTs, actressTs, dvdTs, releasesTs]
      .map(t => (t ? new Date(t).getTime() : NaN))
      .filter(t => Number.isFinite(t));

    const lastUpdate = parsedDates.length > 0
      ? new Date(Math.max(...parsedDates))
      : new Date();

    return NextResponse.json({
      last_update: lastUpdate.toISOString(),
      timezone: 'UTC',
      event_last_update: eventTs,
      actress_last_update: actressTs,
      dvd_ranking_last_update: dvdTs,
      new_releases_last_update: releasesTs,
    });
  } catch (error) {
    console.error('[last-update] DB error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Database error', detail: message }, { status: 500 });
  }
}
