import { NextRequest, NextResponse } from 'next/server';

/**
 * 輕量鑑權把關 —— 防止 admin / setup / seed / debug / cron 等
 * 高危 endpoint 被公開互聯網任意呼叫（見代碼審查 🔴 #2）。
 *
 * Admin 路由：客戶端送 header `x-admin-token: <ADMIN_TOKEN>`
 * Cron 路由：Vercel 送 `Authorization: Bearer <CRON_SECRET>`
 *
 * 若對應 env secret 未設定，預設拒絕（fail-closed），
 * 避免「忘記設 secret = 大門常開」。
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function checkToken(provided: string | null, expected: string | undefined): boolean {
  if (!expected) return false; // 未設定 secret → fail-closed
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

/** 回傳 null = 通過；回傳 NextResponse = 拒絕（直接 return 給客戶端） */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.headers.get('x-admin-token');
  if (!checkToken(token, process.env.ADMIN_TOKEN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** 回傳 null = 通過；回傳 NextResponse = 拒絕。驗證 Bearer token（Vercel Cron）。 */
export function requireCron(request: NextRequest): NextResponse | null {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!checkToken(bearer, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
