import { NextResponse } from 'next/server';
import { sql, getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Debug API - 檢查數據庫連接
export async function GET() {
  try {
    // 1. 測試連接字
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      '';
    
    const hasUrl = url.length > 0;
    
    // 2. 測試 sql function
    const result = await sql`SELECT 1 as test`;
    
    // 3. 測試 count
    const actressCount = await sql`SELECT COUNT(*) as count FROM actresses`;
    const eventCount = await sql`SELECT COUNT(*) as count FROM events`;
    
    return NextResponse.json({
      hasDatabaseUrl: hasUrl,
      urlLength: url.length,
      testQuery: result[0]?.test,
      actressCount: Number(actressCount[0]?.count || 0),
      eventCount: Number(eventCount[0]?.count || 0),
      success: true
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: true,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    }, { status: 500 });
  }
}