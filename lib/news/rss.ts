import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import type { NewsCategory, NewsSource } from './sources';
import { NEWS_SOURCES } from './sources';

export type NormalizedNewsItem = {
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
  canonicalUrl: string;
  titleJa: string;
  summaryJa: string;
  author: string | null;
  imageUrl: string | null;
  category: NewsCategory;
  isAdult: boolean;
  publishedAt: Date | null;
  contentHash: string;
  raw: Record<string, unknown>;
};

const UA = 'Mozilla/5.0 (compatible; JCHINGNewsBot/0.1; +https://j-star-data.vercel.app)';

function cleanText(input: string | null | undefined): string {
  return (input || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function localName(name: string): string {
  return name.includes(':') ? name.split(':').pop() || name : name;
}

function childContent(el: cheerio.Cheerio<AnyNode>, html: boolean, ...names: string[]): string {
  const wanted = new Set(names.map(localName));
  let out = '';
  el.children().each((_, child) => {
    const node = child as Element;
    if (!out && node.tagName && wanted.has(localName(node.tagName))) {
      const $child = cheerio.load(child as AnyNode);
      out = html ? ($child.root().html() || '') : $child.root().text();
    }
  });
  return cleanText(out);
}

function childAttr(el: cheerio.Cheerio<AnyNode>, attr: string, ...names: string[]): string {
  const wanted = new Set(names.map(localName));
  let out = '';
  el.children().each((_, child) => {
    const node = child as Element;
    if (!out && node.tagName && wanted.has(localName(node.tagName))) {
      out = node.attribs?.[attr] || '';
    }
  });
  return out;
}

function absoluteUrl(href: string): string {
  try {
    return new URL(href).href;
  } catch {
    return href;
  }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function categorize(title: string, fallback: NewsCategory): NewsCategory {
  if (/インタビュー|対談|赤裸々|告白/.test(title)) return 'interview';
  if (/イベントレポート|フェス|イベント/.test(title)) return 'event_report';
  if (/写真集|グラビア|配信中/.test(title)) return 'gravure';
  if (/デビュー|引退|移籍|発売|リリース/.test(title)) return 'release';
  return fallback;
}

function extractImage(el: cheerio.Cheerio<AnyNode>): string | null {
  const media = childAttr(el, 'url', 'media:thumbnail', 'media:content', 'enclosure')
    || childAttr(el, 'url', 'enclosure');
  if (media) return absoluteUrl(media);
  const htmlText = childContent(el, true, 'description', 'content:encoded', 'summary');
  const img = htmlText.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? absoluteUrl(img[1]) : null;
}

export async function fetchRss(source: NewsSource, fetchImpl: typeof fetch = fetch): Promise<NormalizedNewsItem[]> {
  const response = await fetchImpl(source.url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    next: { revalidate: 0 },
  } as RequestInit & { next: { revalidate: number } });
  if (!response.ok) throw new Error(`${source.key} RSS HTTP ${response.status}`);

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const nodes = $('item').length ? $('item') : $('rdf\\:item, item');
  const items: NormalizedNewsItem[] = [];

  nodes.each((_, node) => {
    const el = $(node);
    const link = cleanText(el.find('link').first().text()) || el.find('link').attr('href') || '';
    const guid = childContent(el, false, 'guid') || link;
    const title = childContent(el, false, 'title');
    if (!title || !link) return;

    const summary = childContent(el, false, 'description', 'content:encoded', 'summary').slice(0, 500);
    const author = childContent(el, false, 'author', 'dc:creator', 'creator') || null;
    const dateRaw = childContent(el, false, 'pubDate', 'dc:date', 'updated', 'published');
    const sourceUrl = absoluteUrl(link);
    const canonicalUrl = absoluteUrl(guid || link);
    const contentHash = createHash('sha256')
      .update(`${source.key}\n${canonicalUrl}\n${title}`)
      .digest('hex');

    items.push({
      sourceKey: source.key,
      sourceName: source.name,
      sourceUrl,
      canonicalUrl,
      titleJa: title.slice(0, 300),
      summaryJa: summary,
      author,
      imageUrl: extractImage(el),
      category: categorize(title, source.defaultCategory),
      isAdult: source.isAdult,
      publishedAt: parseDate(dateRaw),
      contentHash,
      raw: { guid, dateRaw },
    });
  });

  return items;
}

export async function fetchAllNewsSources(fetchImpl: typeof fetch = fetch): Promise<{
  items: NormalizedNewsItem[];
  errors: Array<{ source: string; error: string }>;
}> {
  const items: NormalizedNewsItem[] = [];
  const errors: Array<{ source: string; error: string }> = [];
  await Promise.all(NEWS_SOURCES.map(async (source) => {
    try {
      items.push(...await fetchRss(source, fetchImpl));
    } catch (error) {
      errors.push({ source: source.key, error: error instanceof Error ? error.message : String(error) });
    }
  }));
  items.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
  return { items, errors };
}
