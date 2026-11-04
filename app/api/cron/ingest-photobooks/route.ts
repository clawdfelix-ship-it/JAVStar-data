import { NextRequest, NextResponse } from 'next/server';
import { requireCron } from '@/lib/auth';
import { fetchAllPhotobooks } from '@/lib/photobooks/hanmoto';
import { ensurePhotobookTables, upsertPhotobookCandidates } from '@/lib/photobooks/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel Cron：掃 hanmoto 出版社 RSS，新寫真集入 pending 審批（唔自動發布）。
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const startedAt = new Date().toISOString();
  try {
    await ensurePhotobookTables();
    const { items, errors } = await fetchAllPhotobooks();
    const result = await upsertPhotobookCandidates(items);
    return NextResponse.json({
      success: true,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      fetched: items.length,
      inserted: result.inserted,
      updated: result.updated,
      errors,
      sample: result.sample,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, started_at: startedAt, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
