import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// 容許 ADMIN_TOKEN 或獨立 INGEST_TOKEN（外部同步腳本用，權限只限事件寫入）。
function requireIngest(req: NextRequest): NextResponse | null {
  const provided =
    req.headers.get('x-admin-token') ||
    req.headers.get('x-ingest-token');
  const expected = process.env.ADMIN_TOKEN || process.env.INGEST_TOKEN;
  const ok =
    !!provided && !!expected && provided.length === expected.length &&
    (() => { let m = 0; for (let i = 0; i < provided.length; i++) m |= provided.charCodeAt(i) ^ expected.charCodeAt(i); return m === 0; })();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

// Admin-only upsert of externally-organised events (自家/合作夥伴場次，非爬蟲來源)。
// Header: x-admin-token: <ADMIN_TOKEN>
// POST /api/admin/events-upsert
// body: { events: Array<{
//   id: string;                 // 穩定外部 id，建議前綴 'javstar-'，避免同 av-event 數字 id 撞
//   actress_id: string;        // JCHING actresses.id
//   title: string;
//   date: 'YYYY-MM-DD';
//   prefecture: string;        // e.g. '香港'
//   venue?: string;
//   event_type?: string;       // meet | photo | other
//   url?: string;              // 站內中繼頁 /partner?to=... 或外部
//   organizer?: string;        // e.g. 'javstarmeet'
// }>, mode?: 'upsert'|'dry' }
//
// 冪等：以 events.id 做 ON CONFLICT UPDATE。mode 'dry' 只回報將寫入嘅列。

type InEvent = {
  id: string;
  actress_id: string;
  title: string;
  date: string;
  prefecture?: string;
  venue?: string;
  event_type?: string;
  url?: string;
  organizer?: string;
};

const TYPES = new Set(['meet', 'photo', 'other']);

export async function POST(req: NextRequest) {
  const denied = requireIngest(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const mode = body?.mode === 'dry' ? 'dry' : 'upsert';
    const list: InEvent[] = Array.isArray(body?.events) ? body.events : [];
    if (list.length === 0) {
      return NextResponse.json({ error: 'events[] required' }, { status: 400 });
    }

    const cleaned: Array<InEvent & { datetime: string }> = [];
    for (const e of list) {
      if (!e.id || !/^[a-zA-Z0-9_\-]+$/.test(e.id)) {
        return NextResponse.json({ error: `bad id: ${e.id}` }, { status: 400 });
      }
      if (!/^\d+$/.test(String(e.actress_id))) {
        return NextResponse.json({ error: `bad actress_id: ${e.actress_id}` }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
        return NextResponse.json({ error: `bad date: ${e.date}` }, { status: 400 });
      }
      const exists = await sql`SELECT 1 FROM actresses WHERE id=${String(e.actress_id)} LIMIT 1`;
      if ((exists as any[]).length === 0) {
        return NextResponse.json({ error: `actress not found: ${e.actress_id}` }, { status: 404 });
      }
      cleaned.push({
        id: e.id,
        actress_id: String(e.actress_id),
        title: String(e.title || '').slice(0, 200),
        date: e.date,
        datetime: e.date,
        prefecture: (e.prefecture || '香港').slice(0, 60),
        venue: (e.venue || '').slice(0, 120),
        event_type: TYPES.has(e.event_type || '') ? e.event_type! : 'meet',
        url: (e.url || '').slice(0, 600),
        organizer: (e.organizer || 'javstarmeet').slice(0, 60),
      });
    }

    if (mode === 'dry') {
      return NextResponse.json({ mode: 'dry', would_upsert: cleaned.length, events: cleaned });
    }

    for (const e of cleaned) {
      await sql`
        INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, date_iso, event_type, url, organizer, created_at)
        VALUES (${e.id}, ${e.actress_id}, ${e.title}, ${e.venue || ''}, ${e.prefecture},
                ${e.datetime}, ${e.date}::date, ${e.event_type}, ${e.url || ''}, ${e.organizer}, now())
        ON CONFLICT (id) DO UPDATE SET
          actress_id=EXCLUDED.actress_id,
          title=EXCLUDED.title,
          venue=EXCLUDED.venue,
          prefecture=EXCLUDED.prefecture,
          datetime=EXCLUDED.datetime,
          date_iso=EXCLUDED.date_iso,
          event_type=EXCLUDED.event_type,
          url=EXCLUDED.url,
          organizer=EXCLUDED.organizer`;
    }

    return NextResponse.json({ success: true, upserted: cleaned.length, ids: cleaned.map((e) => e.id) });
  } catch (e) {
    console.error('events-upsert error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
