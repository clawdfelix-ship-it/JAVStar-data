import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

// POST /api/event-submissions — 粉絲補充活動（公開，無需登入）
// 簡易防濫：每個 IP 每 10 分鐘最多 5 宗；欄位長度/格式收緊。
const MAX_PER_WINDOW = 5;
const WINDOW_SECONDS = 600;

const LIMITS = {
  actressName: 120,
  location: 200,
  content: 2000,
  sourceUrl: 500,
  contact: 120,
};

function clean(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventDate = clean(body.eventDate, 10);
    const actressName = clean(body.actressName, LIMITS.actressName);
    const actressId = clean(body.actressId, 20);
    const location = clean(body.location, LIMITS.location);
    const content = clean(body.content, LIMITS.content);
    const sourceUrl = clean(body.sourceUrl, LIMITS.sourceUrl);
    const contact = clean(body.contact, LIMITS.contact);

    // 必填校驗
    const missing: string[] = [];
    if (!isValidDate(eventDate)) missing.push('eventDate');
    if (!actressName) missing.push('actressName');
    if (!location) missing.push('location');
    if (!content) missing.push('content');
    if (missing.length) {
      return NextResponse.json({ error: '請填妥日期、女優、地點同內容', fields: missing }, { status: 400 });
    }

    // 女優必須係表單搜尋配對到嘅真實女優（numeric id）；驗證真係存在
    let verifiedActressId: string | null = null;
    if (/^\d{1,10}$/.test(actressId)) {
      const found = await sql`SELECT id FROM actresses WHERE id = ${actressId} LIMIT 1`;
      if ((found as any[]).length) verifiedActressId = actressId;
    }
    if (!verifiedActressId) {
      return NextResponse.json(
        { error: '請喺女優欄搜尋並揀選一位女優（自由輸入文字唔受理）', fields: ['actressId'] },
        { status: 400 }
      );
    }

    // 來源連結如果有填，要似 URL 或 TG 群組（寬鬆：http/https/t.me）
    if (sourceUrl && !/^(https?:\/\/|t\.me\/)/i.test(sourceUrl)) {
      return NextResponse.json({ error: '資料來源請填 http(s) 連結或 t.me 群組', fields: ['sourceUrl'] }, { status: 400 });
    }

    const ip = getClientIp(request) || 'unknown';

    // IP 限流（best-effort）
    const recent = await sql`
      SELECT count(*)::int AS cnt FROM event_submissions
      WHERE ip = ${ip} AND created_at > now() - make_interval(secs => ${WINDOW_SECONDS})
    `;
    if (Number((recent as any[])[0]?.cnt || 0) >= MAX_PER_WINDOW) {
      return NextResponse.json({ error: '提交得太密，請稍後再試' }, { status: 429 });
    }

    await sql`
      INSERT INTO event_submissions (event_date, actress_name, actress_id, location, content, source_url, contact, ip)
      VALUES (${eventDate}, ${actressName}, ${verifiedActressId}, ${location}, ${content},
              ${sourceUrl || null}, ${contact || null}, ${ip})
    `;

    return NextResponse.json({ success: true, message: '收到！管理員批核後會喺活動日曆顯示' }, { status: 201 });
  } catch (e) {
    console.error('event submission failed:', e);
    return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 });
  }
}
