import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

function timingEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}
function requireIngest(req: NextRequest): NextResponse | null {
  const provided = req.headers.get('x-admin-token') || req.headers.get('x-ingest-token');
  const candidates = [process.env.ADMIN_TOKEN, process.env.INGEST_TOKEN].filter(Boolean) as string[];
  const ok = !!provided && candidates.some((c) => timingEq(provided, c));
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

// Admin-only delete of self/partner-synced events.
// DELETE /api/admin/events-upsert  body { ids: string[] }
// Only allows ids with a non-numeric external prefix (never scraped av-event numeric ids).
export async function DELETE(req: NextRequest) {
  const denied = requireIngest(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    if (ids.length === 0) return NextResponse.json({ error: 'ids[] required' }, { status: 400 });
    // safety: never delete crawler numeric ids
    const allowed = ids.filter((id) => /^[a-zA-Z][a-zA-Z0-9_\-]+$/.test(id) && !/^\d+$/.test(id));
    if (allowed.length !== ids.length) {
      return NextResponse.json({ error: 'refuse non-external id', bad: ids.filter((x) => !allowed.includes(x)) }, { status: 400 });
    }
    const del = await sql`DELETE FROM events WHERE id = ANY(${allowed}::text[]) RETURNING id`;
    return NextResponse.json({ success: true, deleted: (del as any[]).map((r) => r.id) });
  } catch (e) {
    console.error('events delete error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
