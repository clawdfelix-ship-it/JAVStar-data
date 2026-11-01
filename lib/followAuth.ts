function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function canManageExistingSubscription(
  storedFanToken: string | null | undefined,
  providedFanToken: string | null | undefined
): boolean {
  if (!storedFanToken) return false;
  if (!providedFanToken) return false;
  return timingSafeEqual(storedFanToken, providedFanToken);
}
