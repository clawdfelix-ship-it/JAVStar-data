// 彩文館出版（saibunkan.co.jp）女優寫真集來源：官網靜態頁直接抓取。
//
// 為何值得接（2026-11 實測）：
//  - 性感寫真集在 /01_book/02_sexy/ 四子系列，共約 225 本，全部 ISBN 命名
//  - 預售新刊即有完整資料＋封面（hanmoto RSS 新書 cover 要等出版）
//  - 無 anti-bot、無地域封鎖、零 key，直接 HTTP 200
//
// 輸出對齊 hanmoto.PhotobookCandidate，複用 store.upsertPhotobookCandidates。

export type SaibunkanCandidate = {
  isbn: string;
  title: string; // 原始組合標題（女優＋書名）
  bookTitle: string;
  actressName: string | null;
  photographer: string | null;
  publisher: string;
  coverUrl: string | null;
  sourceUrl: string;
  releaseDate: string | null;
  priceJpy: number | null;
};

const BASE = 'https://www.saibunkan.co.jp';
const PUBLISHER = '彩文館出版';
// 02_sexy 下四個子系列列表頁（相對於 /01_book/）
const LIST_PAGES = [
  '02_sexy/01_g01.html', // 愛蔵版
  '02_sexy/02_x01.html', // X シリーズ
  '02_sexy/03_s01.html', // セクシー
  '02_sexy/04_i01.html', // インライン
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ja-JP,ja;q=0.9' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// 由列表頁收集產品絕對 URL（形如 04_g/9784775607022.html）
async function collectProductUrls(listRel: string): Promise<string[]> {
  const listUrl = `${BASE}/01_book/${listRel}`;
  const html = await fetchHtml(listUrl);
  const hrefs = [...new Set([...html.matchAll(/href="([^"]+\.html)"/g)].map((m) => m[1]))];
  const out: string[] = [];
  for (const href of hrefs) {
    // 只要 ISBN 產品頁（13 位數字 .html）
    if (!/\d{13}\.html$/.test(href)) continue;
    out.push(new URL(href, listUrl).href);
  }
  return [...new Set(out)];
}

function parseProduct(html: string, sourceUrl: string): SaibunkanCandidate | null {
  const isbnRaw = html.match(/ISBN[：:]\s*([0-9\-]{13,17})/);
  if (!isbnRaw) return null;
  const isbn = isbnRaw[1].replace(/-/g, '');
  if (!/^\d{13}$/.test(isbn)) return null;

  const find = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
  };

  // 発売日：2026年12月25日発売
  let releaseDate: string | null = null;
  const dateM = html.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (dateM) {
    const [, y, mo, d] = dateM;
    releaseDate = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 定価：4,620円（本体4,200円+税10％）→ 取標價（税込）
  let priceJpy: number | null = null;
  const priceM = find(/定価[：:]\s*([\d,]+)\s*円/);
  if (priceM) priceJpy = Number(priceM.replace(/,/g, ''));

  const photographer = find(/撮影[：:]\s*([^<\n]+)/);

  // 標題區 pb-title00a：<div class="pb-title00a">RIKKA!!<br>小野六花写真集</div>
  // 要保留 <br> 先 split，故直接喺原始 HTML 取（唔經 find() strip 標籤）
  const titleRaw = html.match(/<[^>]*class="pb-title00a"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  const titleLines = titleRaw
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // 女優名：titleBlock 內「xxx写真集」前綴
  let actressName: string | null = null;
  for (const t of titleLines) {
    const m = t.match(/^(.+?)写真集\s*$/);
    if (m && m[1]) {
      actressName = m[1].trim();
      break;
    }
  }
  // 後備：profile「名前 小野六花（おの りっか）」
  if (!actressName) {
    const prof = find(/名前(?:&ensp;|\s)+(.+?)<\/span>/);
    if (prof) actressName = prof.replace(/（.*?）|\(.*?\)/g, '').trim();
  }

  // 書名：titleBlock 內唔含「写真集」嘅行（如 RIKKA!!）；否則退回女優名
  let bookTitle = titleLines.find((t) => !/写真集\s*$/.test(t)) ?? '';
  if (!bookTitle) bookTitle = actressName ? `${actressName}写真集` : isbn;

  // 封面：image_340/<isbn>.jpg
  const coverUrl = `${BASE}/01_book/image_340/${isbn}.jpg`;

  const title = actressName ? `${actressName}写真集 ${bookTitle}`.trim() : bookTitle;

  return {
    isbn,
    title,
    bookTitle,
    actressName,
    photographer,
    publisher: PUBLISHER,
    coverUrl,
    sourceUrl,
    releaseDate,
    priceJpy,
  };
}

export async function fetchSaibunkanPhotobooks(opts: { limit?: number } = {}): Promise<{
  items: SaibunkanCandidate[];
  errors: Array<{ url: string; error: string }>;
}> {
  const productUrls: string[] = [];
  const listErrors: Array<{ url: string; error: string }> = [];
  for (const rel of LIST_PAGES) {
    try {
      productUrls.push(...(await collectProductUrls(rel)));
    } catch (e) {
      listErrors.push({ url: rel, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const uniq = [...new Set(productUrls)];
  const capped = opts.limit ? uniq.slice(0, opts.limit) : uniq;

  const items: SaibunkanCandidate[] = [];
  const errors = [...listErrors];
  const seen = new Set<string>();
  for (const url of capped) {
    try {
      const html = await fetchHtml(url);
      const cand = parseProduct(html, url);
      if (cand && !seen.has(cand.isbn)) {
        seen.add(cand.isbn);
        items.push(cand);
      }
    } catch (e) {
      // 已下架產品頁（常見 404）靜默跳過，唔中斷整批；其餘錯誤先記
      const msg = e instanceof Error ? e.message : String(e);
      if (/HTTP 404/.test(msg)) continue;
      errors.push({ url, error: msg });
    }
  }
  items.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
  return { items, errors };
}
