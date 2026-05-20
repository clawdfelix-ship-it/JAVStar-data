import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 取所有表的最新時間 - 如果冇 updated_at 就用 created_at
    const [eventResult, actressResult, dvdRankingResult, newReleasesResult] = await Promise.all([
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM events`,
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM actresses`,
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM dvd_ranking`,
      sql`SELECT COALESCE(GREATEST(MAX(created_at), MAX(updated_at)), MAX(created_at), NOW()) as last_update FROM new_releases`
    ]);
    
    const getDate = (result: any) => {
      return Array.isArray(result) && result.length > 0 
        ? (result[0] as any)?.last_update 
        : null;
    };
    
    const dates = [
      new Date(getDate(eventResult) || 0),
      new Date(getDate(actressResult) || 0),
      new Date(getDate(dvdRankingResult) || 0),
      new Date(getDate(newReleasesResult) || 0),
      new Date() // 保底：而家時間
    ];
    
    const lastUpdate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return NextResponse.json({
      last_update: lastUpdate.toISOString(),
      timezone: 'UTC',
      event_last_update: getDate(eventResult),
      actress_last_update: getDate(actressResult),
      dvd_ranking_last_update: getDate(dvdRankingResult),
      new_releases_last_update: getDate(newReleasesResult)
    });
  } catch (error) {
    console.error('[last-update] DB error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Database error', detail: message }, { status: 500 });
  }
}