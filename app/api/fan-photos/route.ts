import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql, getSql } from '@/lib/db';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 每 IP 每 10 分鐘最多 10 宗（見 spec §4.2）
const MAX_PER_WINDOW = 10;
const WINDOW_SECONDS = 600;
const SERVER_MAX_BYTES = 3.5 * 1024 * 1024; // client 壓至 ≤3MB，server 兜底 3.5MB

const LIMITS = {
  caption: 500,
  contact: 120,
  submitterName: 60,
  eventId: 60,
};

function clean(v: FormDataEntryValue | null, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

// 唔信 client 宣告嘅 MIME，直接睇 magic bytes
function sniffImageKind(buf: ArrayBuffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  const b = new Uint8Array(buf);
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return 'image/png';
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  ) {
    return 'image/webp';
  }
  return null;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// TG handle（@xxx 或 xxx）或 email
function isValidContact(v: string): boolean {
  const tg = /^@?[a-zA-Z0-9_]{4,32}$/;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return tg.test(v) || email.test(v);
}

export async function POST(request: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = form.get('file');
    const actressId = clean(form.get('actressId'), 20);
    const contact = clean(form.get('contact'), LIMITS.contact);
    const eventId = clean(form.get('eventId'), LIMITS.eventId);
    const caption = clean(form.get('caption'), LIMITS.caption);
    const submitterName = clean(form.get('submitterName'), LIMITS.submitterName);
    const widthRaw = Number(clean(form.get('width'), 8));
    const heightRaw = Number(clean(form.get('height'), 8));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少圖片檔案' }, { status: 400 });
    }
    if (!/^\d{1,10}$/.test(actressId)) {
      return NextResponse.json({ error: '女優 id 無效' }, { status: 400 });
    }
    if (!contact || !isValidContact(contact)) {
      return NextResponse.json({ error: '請填有效嘅 Telegram handle 或 email 聯絡方法' }, { status: 400 });
    }

    // 女優必須真實存在
    const found = await sql`SELECT id FROM actresses WHERE id = ${actressId} LIMIT 1`;
    if (!(found as unknown[]).length) {
      return NextResponse.json({ error: '女優不存在' }, { status: 404 });
    }

    // 活動可選：有填就核對屬於該女優（軟關聯，唔加硬 FK）
    let verifiedEventId: string | null = null;
    if (eventId) {
      const ev = await sql`SELECT id FROM events WHERE id = ${eventId} AND actress_id = ${actressId} LIMIT 1`;
      if ((ev as unknown[]).length) verifiedEventId = eventId;
    }

    const buf = await file.arrayBuffer();
    if (buf.byteLength > SERVER_MAX_BYTES) {
      return NextResponse.json({ error: '圖片超過 3.5MB 上限' }, { status: 413 });
    }
    const mime = sniffImageKind(buf);
    if (!mime) {
      return NextResponse.json({ error: '只接受 JPEG / PNG / WebP 圖片' }, { status: 415 });
    }

    const ip = getClientIp(request) || 'unknown';

    // IP 限流（best-effort）
    const recent = await sql`
      SELECT count(*)::int AS cnt FROM actress_fan_photos
      WHERE ip = ${ip} AND created_at > now() - make_interval(secs => ${WINDOW_SECONDS})
    `;
    if (Number((recent as Array<{ cnt: number }>)[0]?.cnt || 0) >= MAX_PER_WINDOW) {
      return NextResponse.json({ error: '提交得太密，請稍後再試' }, { status: 429 });
    }

    // 入 Vercel Blob：server 生成隨機檔名，唔用上傳者檔名
    const rand = crypto.randomUUID().slice(0, 12);
    const pathname = `fan-photos/${actressId}/${Date.now()}-${rand}.${EXT[mime]}`;
    const blob = await put(pathname, buf, {
      access: 'public',
      contentType: mime,
    });

    await sql`
      INSERT INTO actress_fan_photos
        (actress_id, event_id, blob_url, thumbnail_url, caption, submitter_contact,
         submitter_name, ip, status, width, height, file_size, mime_type)
      VALUES
        (${actressId}, ${verifiedEventId}, ${blob.url}, ${blob.url},
         ${caption || null}, ${contact}, ${submitterName || null}, ${ip}, 'pending',
         ${Number.isFinite(widthRaw) ? widthRaw : null},
         ${Number.isFinite(heightRaw) ? heightRaw : null},
         ${buf.byteLength}, ${mime})
    `;

    // 唔回 row id / Blob URL，避免繞過審批擴散
    return NextResponse.json(
      { success: true, message: '收到！管理員審批後會喺女優頁顯示' },
      { status: 201 }
    );
  } catch (e) {
    console.error('fan photo upload failed:', e);
    return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 });
  }
}

// GET /api/fan-photos?actressId=<id>[&eventId=][&page=][&pageSize=]
// 公開：只回 status='published'，唔洐 IP／聯絡方法／admin_note。
export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const actressId = String(sp.get('actressId') || '').trim();
    const eventId = String(sp.get('eventId') || '').trim();
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(sp.get('pageSize') || '24', 10) || 24));

    if (!/^\d{1,10}$/.test(actressId)) {
      return NextResponse.json({ error: 'actressId required' }, { status: 400 });
    }

    const conds: string[] = ["status = 'published'", 'actress_id = $1'];
    const params: unknown[] = [actressId];
    if (eventId) {
      params.push(eventId);
      conds.push(`event_id = $${params.length}`);
    }
    const where = conds.join(' AND ');

    const db = getSql();
    const countRows = (await db.query(
      `SELECT count(*)::int AS total FROM actress_fan_photos WHERE ${where}`,
      params
    )) as Array<{ total: number }>;
    const total = countRows[0]?.total ?? 0;

    params.push(pageSize, (page - 1) * pageSize);
    const rows = (await db.query(
      `SELECT id, actress_id, event_id, blob_url, thumbnail_url, caption,
              submitter_name, width, height, created_at
         FROM actress_fan_photos
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )) as Array<Record<string, unknown>>;

    return NextResponse.json({
      data: rows.map((r) => ({
        ...r,
        submitter_name: r.submitter_name || '匿名粉絲',
        thumbnail_url: r.thumbnail_url || r.blob_url,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (e) {
    console.error('fan photos GET failed:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
