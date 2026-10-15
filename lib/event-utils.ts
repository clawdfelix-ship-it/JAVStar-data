export const AGE_GATE_COOKIE = 'jching-age-gate-date';
export const AGE_GATE_STORAGE_KEY = 'jching-age-gate-date';

export const TAIWAN_CITIES = [
  '台北',
  '新北',
  '高雄',
  '台中',
  '台南',
  '桃園',
  '基隆',
  '新竹',
  '嘉義',
  '屏東',
  '宜蘭',
  '花蓮',
  '台東',
] as const;

export function getHkDateString(date: Date): string {
  const hk = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return hk.toISOString().slice(0, 10);
}

export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export function normalizeSubmissionPrefecture(value: string): string {
  const normalized = value.trim();
  if (normalized === '台灣') return '台北';
  return normalized;
}

export function normalizePartnerTarget(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (/^t\.me\//i.test(normalized)) return `https://${normalized}`;
  return '';
}

export function buildPartnerGateUrl(sourceUrl: string, title: string): string {
  const safeTarget = normalizePartnerTarget(sourceUrl);
  if (!safeTarget) return '';
  return `/partner?${new URLSearchParams({
    to: safeTarget,
    title: title.slice(0, 120),
  }).toString()}`;
}

export function getEventHref(event: { id: string; url?: string | null }): string | null {
  const url = event.url?.trim();
  if (url) return url;
  if (event.id.startsWith('fans-')) return null;
  return `https://www.av-event.jp/event/${event.id}/`;
}
