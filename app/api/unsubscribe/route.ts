import { NextRequest } from 'next/server';
import sql from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (UUID_RE.test(token)) {
    await sql`
      UPDATE email_subscribers SET status = 'unsubscribed', updated_at = now()
      WHERE unsubscribe_token = ${token}
    `;
  }
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>訂閱設定｜JCHING</title><style>body{margin:0;background:#f5efe4;color:#1c1a17;font-family:system-ui,-apple-system,sans-serif;display:grid;min-height:100vh;place-items:center}main{max-width:32rem;margin:2rem;padding:2rem;background:#fff;border:1px solid #c9a24b;border-radius:1rem;text-align:center}a{color:#785b1d}</style></head><body><main><h1>訂閱設定已更新</h1><p>如果你之前訂閱過 JCHING 活動通知，而家已經取消。你隨時可以重新訂閱。</p><p><a href="/promo">返回 JCHING</a></p></main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
