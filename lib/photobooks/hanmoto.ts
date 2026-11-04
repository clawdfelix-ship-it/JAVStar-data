// AV 女優寫真集來源：版元ドットコム (hanmoto.com) 出版社 RSS。
// RSS 每社只回最近 20 條、混雜該社所有書；呢度用規則濾出「人物寫真集」。
// 關鍵字 RSS (skey) 實測被忽略，所以維度只有 publisher；每日 cron 掃一次累積。

export const PHOTOBOOK_PUBLISHERS: string[] = [
  'ジーオーティー',
  'ジーウォーク',
  '彩文館出版',
  '玄光社',
  '竹書房',
  '白夜書房',
  '徳間書店',
];

// 中一個就算人物寫真集
const PHOTO_RE = /写真集|ヌードポーズ|プレミアムヌード|Fetish\s*Book|コスプレ/i;
// 明確要排除：攝影教學／特撮／工具／非人物（誤中「写真」嘅書）
const EXCLUDE_RE =
  /見つけ方|撮り方|撮影術|撮影テク|特撮|ヒーロー|ポストカード|入門|テクニック|構図|レシピ|決定版|写真大全|年鑑|カメラ|レンズ|教科書|ガイドブック|How\s?to/i;

export type PhotobookCandidate = {
  isbn: string;
  title: string; // hanmoto 原始標題：「小野六花写真集 RIKKA!! - GOTA SUZUKI(写真) | 彩文館出版」
  bookTitle: string; // 書本標題（減去著者/出版社）
  actressName: string | null; // 推斷女優名（標題前綴）
  photographer: string | null;
  publisher: string;
  coverUrl: string | null; // hanmoto 120px
  sourceUrl: string; // hanmoto 書目頁
  releaseDate: string | null; // RFC822 → ISO date
};

function rssUrl(publisher: string): string {
  return `https://www.hanmoto.com/ci/bd/search/publisher/${encodeURIComponent(publisher)}/vw/rss20`;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? decode(m[1]) : '';
}

// 「小野六花写真集 RIKKA!! - GOTA SUZUKI(写真) | 彩文館出版」
// → { bookTitle: 'RIKKA!!', actressName: '小野六花' }
function parseTitle(raw: string): { bookTitle: string; actressName: string | null; photographer: string | null } {
  // 減去尾段 " | 出版社"
  const beforePub = raw.split('|')[0].trim();
  // 分開書名同著者（" - " 分隔）
  const [head, authorPart] = beforePub.split(/\s+-\s+/);
  const photographer = authorPart ? authorPart.replace(/\(.*?\)/g, '').trim() : null;

  let actressName: string | null = null;
  let bookTitle = head.trim();

  // Cosplay Fetish Book 系列：「Cosplay Fetish Book 福田ゆあ」女優名喺後面，冇「写真集」字眼
  const cf = head.match(/^Cosplay Fetish Book\s+(.+)$/i);
  if (cf) {
    actressName = cf[1].trim();
    bookTitle = 'Cosplay Fetish Book';
  } else {
    const m = head.match(/^(.*?)(?:1st\.?|1ｓｔ\.?)?\s*写真集\s*(.*)$/);
    if (m) {
      actressName = m[1].trim() || null;
      // 去掉書名外層引號『』「」
      let sub = m[2].trim().replace(/^[『「「](.+)[』」」]$/, '$1').replace(/^[『「「]|[』」」]$/g, '').trim();
      // 冇副標題（如「吉根ゆりあ写真集」）→ 書名用回完整標題
      bookTitle = sub || head.trim();
    }
  }
  return { bookTitle, actressName, photographer };
}

export function isPhotobook(rawTitle: string): boolean {
  return PHOTO_RE.test(rawTitle) && !EXCLUDE_RE.test(rawTitle);
}

export async function fetchPublisherPhotobooks(publisher: string): Promise<PhotobookCandidate[]> {
  const res = await fetch(rssUrl(publisher), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36',
      'Accept-Language': 'ja-JP,ja;q=0.9',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`hanmoto RSS ${publisher}: HTTP ${res.status}`);
  const xml = await res.text();

  const out: PhotobookCandidate[] = [];
  for (const block of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const rawTitle = tag(block, 'title');
    if (!isPhotobook(rawTitle)) continue;
    const link = tag(block, 'link');
    const desc = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]) ?? '';
    const img = desc.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null;
    const pubDate = tag(block, 'pubDate');
    const isbn = link.replace(/\/+$/, '').split('/').pop() ?? '';
    if (!/^\d{13}$/.test(isbn)) continue;
    const { bookTitle, actressName, photographer } = parseTitle(rawTitle);
    out.push({
      isbn,
      title: rawTitle,
      bookTitle,
      actressName,
      photographer,
      publisher,
      coverUrl: img ? (img.startsWith('//') ? `https:${img}` : img) : null,
      sourceUrl: link,
      releaseDate: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : null,
    });
  }
  return out;
}

export async function fetchAllPhotobooks(): Promise<{
  items: PhotobookCandidate[];
  errors: Array<{ publisher: string; error: string }>;
}> {
  const items: PhotobookCandidate[] = [];
  const errors: Array<{ publisher: string; error: string }> = [];
  for (const publisher of PHOTOBOOK_PUBLISHERS) {
    try {
      items.push(...(await fetchPublisherPhotobooks(publisher)));
    } catch (e) {
      errors.push({ publisher, error: e instanceof Error ? e.message : String(e) });
    }
  }
  // 用 ISBN 去重（唔同社唔會撞，但保險）
  const seen = new Set<string>();
  const deduped = items.filter((x) => (seen.has(x.isbn) ? false : (seen.add(x.isbn), true)));
  deduped.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
  return { items: deduped, errors };
}
