import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { matchesToken } from '@/lib/token-auth';

export const dynamic = 'force-dynamic';

// Only the interactive admin UI may access subscription exports and deletions.
function authed(req: NextRequest): boolean {
  return matchesToken(req.headers.get('x-admin-token'), process.env.ADMIN_TOKEN);
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sp = req.nextUrl.searchParams;
    const actressId = (sp.get('actress_id') || '').trim();
    const status = sp.get('status') || 'active';
    const region = (sp.get('region') || '').trim();
    const fmt = sp.get('format') || 'json';

    const where: string[] = [];
    if (actressId && /^\d+$/.test(actressId)) where.push(`s.actress_id = '${actressId}'`);
    if (status !== 'all') where.push(`s.status = '${status === 'unsubscribed' ? 'unsubscribed' : 'active'}'`);
    if (region === 'hk' || region === 'taiwan') where.push(`s.region_pref LIKE '%${region}%'`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await (getSql() as any).query(
      `SELECT s.id, s.actress_id, a.name_ja, a.name_cn,
              s.email, s.tg_handle, s.ig_handle,
              s.channel_pref, s.region_pref, s.status, s.source,
              to_char(s.created_at AT TIME ZONE 'Asia/Hong_Kong', 'YYYY-MM-DD HH24:MI') AS created_at_hk,
              s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM fan_events e WHERE e.actress_id = s.actress_id) AS events_seen
       FROM fan_subscriptions s
       LEFT JOIN actresses a ON a.id = s.actress_id
       ${whereSql}
       ORDER BY s.created_at DESC
       LIMIT 2000`,
    ) as any[];

    if (fmt === 'csv') {
      const head = ['actress_id','actress','status','tg_handle','ig_handle','email','channel_pref','region_pref','created_at'];
      const esc = (v: unknown) => {
        const x = v == null ? '' : String(v);
        return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
      };
      const lines = [head.join(',')].concat(
        rows.map((r) => [r.actress_id, r.name_ja || r.name_cn, r.status, r.tg_handle, r.ig_handle, r.email, r.channel_pref, r.region_pref, r.created_at_hk].map(esc).join(',')),
      );
      return new NextResponse('﻿' + lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="fan-subscriptions${actressId ? '-' + actressId : ''}.csv"`,
        },
      });
    }

    // per-actress active counts (for the admin picker / dashboard)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts: any[] = await (getSql() as any).query(
      `SELECT s.actress_id, a.name_ja, a.name_cn, COUNT(*) AS active
       FROM fan_subscriptions s LEFT JOIN actresses a ON a.id = s.actress_id
       WHERE s.status = 'active'
       GROUP BY s.actress_id, a.name_ja, a.name_cn
       ORDER BY active DESC
       LIMIT 200`,
    ) as any[];

    return NextResponse.json({
      total: rows.length,
      data: rows,
      active_by_actress: counts.map((c) => ({
        actress_id: c.actress_id,
        name: c.name_ja || c.name_cn || c.actress_id,
        active: Number(c.active),
      })),
    });
  } catch (e) {
    console.error('fan-subscriptions admin error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

// Admin：永久刪除一條追蹤（清理壞/測試記錄）。DELETE ?actress_id=&identity_key=
export async function DELETE(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const sp = req.nextUrl.searchParams;
    const actressId = (sp.get('actress_id') || '').trim();
    const identity = (sp.get('identity_key') || '').trim();
    if (!/^\d+$/.test(actressId) || !/^[a-z]{1,8}:[A-Za-z0-9_.@+-]{1,100}$/.test(identity)) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    const sql = getSql();
    const del = await sql`DELETE FROM fan_subscriptions
      WHERE actress_id=${actressId} AND identity_key=${identity} RETURNING id`;
    return NextResponse.json({ deleted: (del as any[]).length });
  } catch (e) {
    console.error('fan-subscriptions delete', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
