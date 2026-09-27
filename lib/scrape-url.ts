const ALLOWED_EVENT_HOSTS = new Set(['av-event.jp', 'www.av-event.jp']);
const EVENT_PATH_PATTERN = /^\/event\/[^/]+\/?$/;

function buildFallbackUrl(eventId?: string): string {
  if (!eventId) return '';
  return `https://www.av-event.jp/event/${encodeURIComponent(eventId)}/`;
}

export function normalizeScrapeActressUrl(rawUrl?: string | null, eventId?: string): string {
  const candidate = String(rawUrl || buildFallbackUrl(eventId)).trim();
  if (!candidate) {
    throw new Error('Missing event URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Invalid event URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported event URL protocol');
  }

  if (!ALLOWED_EVENT_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('Unsupported event source host');
  }

  if (!EVENT_PATH_PATTERN.test(parsed.pathname)) {
    throw new Error('Unsupported event URL path');
  }

  parsed.protocol = 'https:';
  parsed.username = '';
  parsed.password = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}
