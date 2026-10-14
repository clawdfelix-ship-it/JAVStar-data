import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { ensureFanNotifyTables } from '@/lib/fanNotify';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Admin 後台用：列出未來自家（javstarmeet）場，連同可發 TG 通知嘅訂閱人數同批次狀態。
// GET /api/admin/notify-events
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await ensureFanNotifyTables();
    const rows = await sql`
      SELECT e.id, e.actress_id, e.title, e.date_iso, e.venue, e.prefecture, e.url,
             (
               SELECT count(*) FROM fan_subscriptions s
               WHERE s.actress_id = e.actress_id AND s.status='active'
                 AND s.identity_key LIKE 'tgchat:%'
                 AND (',' || s.region_pref || ',') LIKE
                     CASE WHEN e.prefecture LIKE '%台%' THEN '%,taiwan,%' ELSE '%,hk,%' END
             )::int AS tg_recipients,
             EXISTS (
               SELECT 1 FROM fan_notify_outbox o
               WHERE o.event_id = e.id AND o.status='pending'
             ) AS batch_pending,
             EXISTS (
               SELECT 1 FROM fan_notify_outbox o
               WHERE o.event_id = e.id AND o.status='pulled'
             ) AS batch_sent
      FROM events e
      WHERE e.organizer='javstarmeet' AND e.date_iso >= CURRENT_DATE
      ORDER BY e.date_iso ASC, e.id ASC
      LIMIT 100`;
    return NextResponse.json({ events: rows });
  } catch (e) {
    console.error('notify-events', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
