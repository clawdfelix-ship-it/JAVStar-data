import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 禁用所有緩存

export async function GET() {
  const startTime = Date.now();
  
  try {
    // 直接用 neon 客戶端，唔經任何包裝
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      '';
    
    if (!url) {
      return NextResponse.json({ 
        error: true, 
        message: 'No database URL found' 
      }, { status: 500 });
    }
    
    const sql = neon(url);
    
    // 簡單查詢
    const actressResult = await sql`SELECT COUNT(*) as count FROM actresses`;
    const eventResult = await sql`SELECT COUNT(*) as count FROM events`;
    const voteResult = await sql`SELECT COUNT(*) as count FROM votes`;
    
    // 最後更新時間
    const lastUpdateResult = await sql`SELECT NOW() as last_update`;
    
    const actressCount = Number(actressResult[0]?.count || 0);
    const eventCount = Number(eventResult[0]?.count || 0);
    const voteCount = Number(voteResult[0]?.count || 0);
    const lastUpdate = lastUpdateResult[0]?.last_update || new Date().toISOString();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      actressCount,
      eventCount,
      voteCount,
      lastUpdate,
      queryDurationMs: duration,
      success: true
    });
    
  } catch (error: any) {
    return NextResponse.json({
      actressCount: 0,
      eventCount: 0,
      voteCount: 0,
      lastUpdate: new Date().toISOString(),
      error: true,
      message: error.message,
      stack: error.stack?.substring(0, 300)
    }, { status: 500 });
  }
}