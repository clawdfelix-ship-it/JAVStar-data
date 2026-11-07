import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendMetaLead, sha256 } from '@/lib/metaCapi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const source = String(body.source ?? 'jching').trim().slice(0, 80) || 'jching';
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: '請輸入有效 email' }, { status: 400 });
    }

    const ipAddress = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
    const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 500);
    const ipHash = ipAddress ? sha256(`jching-email-v1:${ipAddress}`) : '';
    if (ipHash) {
      const recent = (await sql`
        SELECT count(*)::int AS n FROM email_subscribers
        WHERE request_ip_hash = ${ipHash}
          AND consent_at > now() - interval '1 hour'
      `) as Array<{ n: number }>;
      if (recent[0].n >= 10) {
        return NextResponse.json({ error: '提交太頻密，請稍後再試' }, { status: 429 });
      }
    }

    const eventId = UUID_RE.test(String(body.event_id ?? ''))
      ? String(body.event_id)
      : randomUUID();
    const saved = (await sql`
      INSERT INTO email_subscribers
        (email, source, status, consent_at, updated_at, last_event_id, request_ip_hash)
      VALUES (${email}, ${source}, 'active', now(), now(), ${eventId}, ${ipHash})
      ON CONFLICT (email) DO UPDATE SET
        status = 'active', source = EXCLUDED.source, consent_at = now(),
        updated_at = now(), last_event_id = EXCLUDED.last_event_id,
        request_ip_hash = EXCLUDED.request_ip_hash
      RETURNING id
    `) as Array<{ id: string }>;
    if (!saved[0]?.id) throw new Error('Subscription was not saved');

    let tracking: Record<string, unknown> = { configured: false };
    if (source === 'promo') {
      tracking = await sendMetaLead({
        email,
        eventId,
        eventSourceUrl: 'https://www.jching-calendar.com/promo',
        ipAddress,
        userAgent,
        fbp: request.cookies.get('_fbp')?.value,
        fbc: request.cookies.get('_fbc')?.value,
      });
    }

    return NextResponse.json({
      success: true,
      message: '已訂閱！有新活動時會第一時間通知你 🎉',
      event_id: eventId,
      tracking,
    });
  } catch (error) {
    console.error('Email subscribe failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: '訂閱失敗，請稍後再試' }, { status: 500 });
  }
}
