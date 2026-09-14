import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

// POST /api/contact-messages — 廣告查詢/合作表單（公開，無需登入）
// 先存入庫；自動發信喺有收件 email 後接通（2026-09-14）。
// 簡易防濫：每個 IP 每 10 分鐘最多 3 宗。
const MAX_PER_WINDOW = 3;
const WINDOW_SECONDS = 600;

const LIMITS = { name: 120, contact: 200, topic: 40, message: 3000 };
const ALLOWED_TOPICS = ['合作查詢', '廣告贊助', '活動聯辦', '其他'];

function clean(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

// 簡單蜜罐：bot 通常會填埋隱藏欄位
function looksLikeSpam(body: any): boolean {
  return Boolean(body?.website && String(body.website).trim());
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (looksLikeSpam(body)) {
      // 蜜罐中咗都扮成功，唔好提示 spammer
      return NextResponse.json({ success: true, message: '收到！我哋會盡快回覆' }, { status: 201 });
    }

    const name = clean(body.name, LIMITS.name);
    const contact = clean(body.contact, LIMITS.contact);
    const topic = clean(body.topic, LIMITS.topic) || '合作查詢';
    const message = clean(body.message, LIMITS.message);

    const missing: string[] = [];
    if (!contact) missing.push('contact');
    if (!message || message.length < 5) missing.push('message');
    if (missing.length) {
      return NextResponse.json({ error: '請填妥聯絡方法同查詢內容', fields: missing }, { status: 400 });
    }
    if (!ALLOWED_TOPICS.includes(topic)) {
      return NextResponse.json({ error: '查詢類型無效', fields: ['topic'] }, { status: 400 });
    }

    const ip = getClientIp(request) || 'unknown';

    const recent = await sql`
      SELECT count(*)::int AS cnt FROM contact_messages
      WHERE ip = ${ip} AND created_at > now() - make_interval(secs => ${WINDOW_SECONDS})
    `;
    if (Number((recent as any[])[0]?.cnt || 0) >= MAX_PER_WINDOW) {
      return NextResponse.json({ error: '提交得太密，請稍後再試' }, { status: 429 });
    }

    await sql`
      INSERT INTO contact_messages (name, contact, topic, message, ip)
      VALUES (${name || null}, ${contact}, ${topic}, ${message}, ${ip})
    `;

    return NextResponse.json({ success: true, message: '收到！我哋會盡快回覆' }, { status: 201 });
  } catch (e) {
    console.error('contact message failed:', e);
    return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 });
  }
}
