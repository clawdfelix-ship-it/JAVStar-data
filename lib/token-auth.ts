export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function matchesToken(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(provided, expected);
}

export function matchesAnyToken(
  provided: string | null | undefined,
  expectedTokens: Array<string | undefined>,
): boolean {
  if (!provided) return false;
  return expectedTokens.some((token) => matchesToken(provided, token));
}
