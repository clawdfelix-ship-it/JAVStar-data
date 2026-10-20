export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function checkToken(provided: string | null, expected: string | undefined): boolean {
  if (!expected) return false;
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

export function hasAdminToken(headers: Headers, expected: string | undefined): boolean {
  return checkToken(headers.get('x-admin-token'), expected);
}

export function hasBearerToken(headers: Headers, expected: string | undefined): boolean {
  const auth = headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return checkToken(bearer, expected);
}
