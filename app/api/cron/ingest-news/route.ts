import { NextRequest, NextResponse } from 'next/server';
import { requireCron } from '@/lib/auth';
import { fetchAllNewsSources } from '@/lib/news/rss';
import { ensureNewsTables, upsertPendingNewsItems } from '@/lib/news/ingest';
import { translatePendingNewsItems } from '@/lib/news/translate';
import { backfillNewsCovers } from '@/lib/news/cover';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel Cron: ingest RSS news into pending moderation queue.
// No public UI reads pending items yet.
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const startedAt = new Date().toISOString();
  try {
    await ensureNewsTables();
    const { items, errors } = await fetchAllNewsSources();
    const result = await upsertPendingNewsItems(items);

    // Translate any untranslated rows (new + backlog). Failure must not break ingestion.
    let translation = { translated: 0, failed: 0, errors: [] as Array<{ id: number; error: string }> };
    try {
      translation = await translatePendingNewsItems(30);
    } catch (error) {
      translation.errors.push({ id: -1, error: error instanceof Error ? error.message : String(error) });
    }

    // Resolve og:image covers for rows without one (soft failures only).
    let covers = { covered: 0, failed: 0, errors: [] as Array<{ id: number; error: string }> };
    try {
      covers = await backfillNewsCovers(20);
    } catch (error) {
      covers.errors.push({ id: -1, error: error instanceof Error ? error.message : String(error) });
    }

    return NextResponse.json({
      success: true,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      fetched: items.length,
      inserted: result.inserted,
      skipped: result.skipped,
      errors,
      translation,
      covers,
      sample_titles: result.sampleTitles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        started_at: startedAt,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
