import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sql`SELECT MAX(created_at) as last_update FROM events`;
    const lastUpdate = Array.isArray(result) && result.length > 0 
      ? (result[0] as any)?.last_update 
      : null;
    
    return NextResponse.json({
      last_update: lastUpdate,
      timezone: 'UTC'
    });
  } catch (error) {
    console.error('[last-update] DB error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Database error', detail: message }, { status: 500 });
  }
}
