import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 禁用所有緩存

export async function GET() {
  const startTime = Date.now();
  
  try {
    // 檢查所有可能嘅環境變量
    const dbUrl = process.env.DATABASE_URL;
    const postgresUrl = process.env.POSTGRES_URL;
    const postgresUrlNonPooling = process.env.POSTGRES_URL_NON_POOLING;
    
    console.log('Env check:', {
      has_DATABASE_URL: !!dbUrl,
      has_POSTGRES_URL: !!postgresUrl,
      has_POSTGRES_URL_NON_POOLING: !!postgresUrlNonPooling,
      DATABASE_URL_prefix: dbUrl ? dbUrl.substring(0, 15) + '...' : 'N/A',
    });
    
    const url = dbUrl || postgresUrl || postgresUrlNonPooling || '';
    
    if (!url) {
      console.error('No database URL found in environment variables');
      return NextResponse.json({ 
        error: true, 
        message: 'No database URL found',
        has_DATABASE_URL: !!dbUrl,
        has_POSTGRES_URL: !!postgresUrl,
        has_POSTGRES_URL_NON_POOLING: !!postgresUrlNonPooling,
      }, { status: 500 });
    }
    
    // 直接用 neon 客戶端，唔經任何包裝
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
    console.error('Stats API Error:', {
      message: error.message,
      stack: error.stack,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
    });
    
    return NextResponse.json({
      actressCount: 0,
      eventCount: 0,
      voteCount: 0,
      lastUpdate: new Date().toISOString(),
      error: true,
      message: error.message,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
    }, { status: 500 });
  }
}