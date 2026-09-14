import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/contact-messages?status=new — 合作查詢列表（admin）
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'new';
    const allowed = ['new', 'read', 'archived', 'all'];
    const st = allowed.includes(status) ? status : 'new';

    const rows = st === 'all'
      ? await sql`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200`
      : await sql`SELECT * FROM contact_messages WHERE status = ${st} ORDER BY created_at DESC LIMIT 200`;

    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST body: { action:'read'|'archived'|'reopen', id }
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const body = await request.json();
    const id = Number(body?.id);
    const action = String(body?.action || '');
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
    if (!['read', 'archived', 'reopen'].includes(action)) {
      return NextResponse.json({ error: 'bad action' }, { status: 400 });
    }
    const status = action === 'reopen' ? 'new' : action;
    await sql`UPDATE contact_messages SET status = ${status} WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
