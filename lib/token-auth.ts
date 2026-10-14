type HeaderLike = Pick<Headers, 'get'>;

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function matchesToken(provided: string | null, expected: string | undefined): boolean {
  if (!expected) return false;
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

export function hasHeaderToken(
  headers: HeaderLike,
  headerName: string,
  expected: string | undefined,
): boolean {
  return matchesToken(headers.get(headerName), expected);
}

export function hasAdminToken(
  headers: HeaderLike,
  adminToken: string | undefined = process.env.ADMIN_TOKEN,
): boolean {
  return hasHeaderToken(headers, 'x-admin-token', adminToken);
}

export function hasIngestToken(
  headers: HeaderLike,
  ingestToken: string | undefined = process.env.INGEST_TOKEN,
): boolean {
  return hasHeaderToken(headers, 'x-ingest-token', ingestToken);
}

export function hasAdminOrIngestToken(
  headers: HeaderLike,
  adminToken: string | undefined = process.env.ADMIN_TOKEN,
  ingestToken: string | undefined = process.env.INGEST_TOKEN,
): boolean {
  return hasAdminToken(headers, adminToken) || hasIngestToken(headers, ingestToken);
}
