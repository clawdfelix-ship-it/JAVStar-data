function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function checkToken(
  provided: string | null,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

export function isAdminToken(
  token: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return checkToken(token, env.ADMIN_TOKEN);
}
