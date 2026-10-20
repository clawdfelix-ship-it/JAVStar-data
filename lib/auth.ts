import { NextRequest, NextResponse } from 'next/server';
import { hasAdminToken as hasAdminTokenHeader, hasBearerToken } from '@/lib/token-auth';

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

export function hasAdminToken(headers: Headers): boolean {
  return hasAdminTokenHeader(headers, process.env.ADMIN_TOKEN);
}

export function hasCronToken(headers: Headers): boolean {
  return hasBearerToken(headers, process.env.CRON_SECRET);
}

/** 回傳 null = 通過；回傳 NextResponse = 拒絕（直接 return 給客戶端） */
export function requireAdmin(request: NextRequest): NextResponse | null {
  if (!hasAdminToken(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** 回傳 null = 通過；回傳 NextResponse = 拒絕。驗證 Bearer token（Vercel Cron）。 */
export function requireCron(request: NextRequest): NextResponse | null {
  if (!hasCronToken(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
