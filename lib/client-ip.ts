import { NextRequest } from 'next/server';

/**
 * 取真實客戶 IP（投票/頻率限制用）。
 *
 * - Vercel 設嘅 `x-real-ip` 係直接連線 peer，客戶偽造唔到 → 優先
 * - `x-forwarded-for` 客戶可以塞假值落最前面；Vercel 會將真實 IP append 落最後 → 取最後一個
 * - 2026-09 起投票為「每月一票」，IP 只用作同月去重 + 每日頻率上限，唔做永久身份
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

/** 香港時區嘅當前月份 'YYYY-MM'（server 行 UTC，月界喺 16:00 UTC） */
export const HK_MONTH_EXPR = `to_char(now() AT TIME ZONE 'Asia/Hong_Kong', 'YYYY-MM')`;
/** 香港時區嘅今日 'YYYY-MM-DD' */
export const HK_TODAY_EXPR = `to_char((now() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD')`;
