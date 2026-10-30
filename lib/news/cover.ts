import { getSql } from '@/lib/db';

// Resolve a cover image for a news item by fetching the source article page
// and reading its og:image (the RSS feeds themselves carry no images).
// Hot-linked from the original host with a link back to the source — we never
// re-host or copy the file (copyright-consistent with title + short summary only).
const UA =
  'Mozilla/5.0 (compatible; JCHINGNewsBot/0.1; +https://j-star-data.vercel.app)';

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

export async function fetchCoverImage(
  sourceUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetchImpl(sourceUrl, {
      headers: { 'user-agent': UA, accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    } as RequestInit & { next: { revalidate: number } });
    if (!res.ok) return null;
    const html = await res.text();

    // og:image / og:image:url (with optional single/double quotes, any order).
    const meta =
      html.match(
        /<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i
      );
    if (meta?.[1]) return absolute(meta[1], sourceUrl);

    // Twitter card fallback.
    const tw =
      html.match(/<meta[^>]+name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (tw?.[1]) return absolute(tw[1], sourceUrl);

    // First content <img> as last resort (skip tracking/icons).
    const img = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (img?.[1] && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(img[1])) {
      return absolute(img[1], sourceUrl);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type CoverBackfillResult = {
  covered: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
};

// Fill image_url for rows that still have none. Runs for any status so newly
// published items also get a cover. Failures are soft (image_url stays NULL).
export async function backfillNewsCovers(limit = 20): Promise<CoverBackfillResult> {
  const result: CoverBackfillResult = { covered: 0, failed: 0, errors: [] };
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT id, source_url
       FROM news_items
      WHERE COALESCE(image_url, '') = ''
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $1`,
    [limit]
  )) as Array<{ id: number; source_url: string }>;

  for (const row of rows) {
    try {
      const cover = await fetchCoverImage(row.source_url);
      if (!cover) {
        result.failed += 1;
        continue;
      }
      await sql.query(`UPDATE news_items SET image_url = $1, updated_at = NOW() WHERE id = $2`, [
        cover,
        row.id,
      ]);
      result.covered += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ id: row.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}
