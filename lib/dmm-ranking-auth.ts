import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from './auth';

export function authorizeDmmRankingWrite(request: NextRequest): NextResponse | null {
  return requireAdmin(request);
}
