import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (compatible; JCHINGNewsBot/0.1; +https://j-star-data.vercel.app)';

// Fetch a source article page and extract its main body text (Japanese).
// Used only to feed the translator a richer context so it can write a longer
// Chinese summary — we never store or republish the full text (copyright).
export async function fetchArticleBody(
  sourceUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetchImpl(sourceUrl, {
      headers: { 'user-agent': UA, accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    } as RequestInit & { next: { revalidate: number } });
    if (!res.ok) return '';
    const html = await res.text();
    return extractArticleBody(html);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export function extractArticleBody(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);

  // Drop non-article noise before reading text.
  $(
    [
      'script',
      'style',
      'noscript',
      'iframe',
      'nav',
      'header',
      'footer',
      'aside',
      'form',
      '.blogcard',
      '.ad',
      '.ads',
      '.adsense',
      '.advertisement',
      '.entry-footer',
      '.article-footer',
      '.sns',
      '.sns-share',
      '.related',
      '.recommended',
      '.carousel',
      '.toc',
      '#toc',
      '.page-link',
      '.pagination',
    ].join(',')
  ).remove();

  // Best-to-weakest main-content selectors across our sources
  // (dxbeppin-r = WordPress Cocoon `.entry-content`; livedoor blog = `.article-body`).
  // Cocoon renders several small `.entry-content` cards (related posts), so for the
  // generic class selectors pick the element with the LONGEST text, not .first().
  const selectors = [
    'article .entry-content',
    '.article-body',
    '.article-body-inner',
    '.main-text',
    '[itemprop="articleBody"]',
    '.entry-content',
    'article',
    '.content',
    'main',
  ];

  for (const sel of selectors) {
    const nodes = $(sel);
    if (!nodes.length) continue;
    let best = '';
    nodes.each((_, node) => {
      const text = $(node).text().replace(/\s+/g, ' ').trim();
      if (text.length > best.length) best = text;
    });
    if (best.length >= 120) {
      return cleanBody(best).slice(0, 2500);
    }
  }
  return '';
}

function cleanBody(text: string): string {
  let out = text
    // strip affiliate/PR boilerplate commonly repeated on these sources
    .replace(/※当サイト[^。]*?(アフィリエイト|広告リンク)[^。]*。/g, '');
  // A leading PR line. Keep this NON-greedy and bounded: a PR pitch ends at the
  // first sentence terminator, NOT at the next 】 (the PR label often contains no
  // closing 】, so 【PR】[^】]*】 would swallow thousands of chars of real body).
  out = out.replace(/^[\s【PR】]*【PR】[^。！？!?]{0,120}[。！？!?]?/g, '');
  out = out
    .replace(/続きを読む/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}
