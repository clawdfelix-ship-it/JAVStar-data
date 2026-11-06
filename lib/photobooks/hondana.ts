// hondana 本棚平台通用寫真集來源（一個 parser 覆蓋多間共用出版社官網）。
//
// 2026-11 實測：竹書房、徳間書店、玄光社、白夜書房 全部用 hondana 系統，
// 產品 URL 統一 /book/b<8位>.html，產品頁欄位 schema 一致：
//   著者 / ジャンル（含「写真集」分類樹）/ 出版年月日 YYYY/MM/DD /
//   ISBN（978 �數字）/ 判型・ページ数 / 定価（税込）
// 封面：og:image（竹書房走 hondana-image.s3，徳間走自家 /images/book/）。
//
// 輸出對齊 hanmoto.PhotobookCandidate，複用 store.upsertPhotobookCandidates。

export type HondanaPublisher = {
  key: string;
  publisher: string; // photobooks.publisher 寫入值
  base: string; // 官網根
  listPaths: string[]; // 寫真集/新刊列表頁路徑
};

export const HONDANA_PUBLISHERS: HondanaPublisher[] = [
  {
    key: 'takeshobo',
    publisher: '竹書房',
    base: 'https://www.takeshobo.co.jp',
    listPaths: ['/search/new.html'],
  },
  {
    key: 'tokuma',
    publisher: '徳間書店',
    base: 'https://www.tokuma.jp',
    listPaths: ['/smp/search/new.html'],
  },
  {
    key: 'genkosha',
    publisher: '玄光社',
    base: 'https://www.genkosha.co.jp',
    // 同 hondana 平台，新刊列表路徑與竹書房一致（實測 12 本/頁）
    listPaths: ['/search/new.html'],
  },
  {
    key: 'byakuya',
    publisher: '白夜書房',
    base: 'https://www.byakuya-shobo.co.jp',
    // 同 hondana 平台，新刊列表路徑一致（實測 12 本/頁）
    listPaths: ['/search/new.html'],
  },
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

function decode(s: string): string {
  return s
    .replace(/&nbsp;|&ensp;|&emsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 由列表頁收集 /book/b<digits>.html 產品絕對 URL
async function collectProductUrls(pub: HondanaPublisher): Promise<string[]> {
  const urls: string[] = [];
  for (const path of pub.listPaths) {
    const listUrl = new URL(path, pub.base).href;
    const html = await fetchHtml(listUrl);
    const hrefs = [...new Set([...html.matchAll(/href="([^"]*?\/book\/b\d+\.html?)"/g)].map((m) => m[1]))];
    for (const href of hrefs) urls.push(new URL(href, listUrl).href);
  }
  return [...new Set(urls)];
}

// hondana 產品頁普遍有兩組表格（搜索側欄＋產品詳情），側欄 cell 多數空值，
// 且詳情區相對 ISBN 嘅位置每間社唔同（竹書房在前、徳間在後）。
// 穩健做法：全頁抓某 label 的所有 th/td，取最後一個非空值＝詳情區。
function parseProduct(html: string, sourceUrl: string, publisher: string) {
  const allCells = (label: string): string[] => {
    const re = new RegExp(
      `<(?:th|dt)[^>]*>\\s*${label}\\s*</(?:th|dt)>\\s*<(?:td|dd)[^>]*>([\\s\\S]*?)</(?:td|dd)>`,
      'g'
    );
    return [...html.matchAll(re)]
      .map((m) => decode(m[1]))
      .filter(Boolean);
  };
  const cell = (label: string): string | null => {
    const vals = allCells(label);
    return vals.length ? vals[vals.length - 1] : null;
  };

  // 詳情區 ISBN（過濾側欄，取 978 開頭）
  const isbn = (cell('ISBN') ?? '').replace(/[^0-9]/g, '').match(/978\d{10}/)?.[0]
    ?? html.match(/978\d{10}/)?.[0]
    ?? null;
  if (!isbn) return null;

  // 只要寫真集：詳情區ジャンル含「写真集」，且書名本身含「写真集」
  //（雙重把關，排除ジャンル樹連帶「美術・写真集」嘅繪本/小說）
  const genre = cell('ジャンル') ?? '';
  if (!/写真集/.test(genre)) return null;

  // 出版年月日 2026/11/18 → 2026-11-18
  let releaseDate: string | null = null;
  const dm = (cell('出版年月日') ?? '').match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (dm) releaseDate = `${dm[1]}-${dm[2]}-${dm[3]}`;

  // 定価 4,950円（税込）
  let priceJpy: number | null = null;
  const pm = (cell('定価') ?? '').match(/([\d,]+)\s*円/);
  if (pm) priceJpy = Number(pm[1].replace(/,/g, ''));

  // 著者欄位格式不一：
  //  竹書房寫真集常見「富田恭透 撮影」（只剩攝影師，女優名在書名）
  //  徳間常見「伊藤舞雪 著・文・その他 高橋慶佑 写真」（女優在前、攝影師在後）
  const authorRaw = cell('著者') ?? '';
  const photographer = (() => {
    // 「X 撮影」直接取 X；「…その他 Y 写真」取 Y（喺 その他/著・文 之後先算攝影師）
    const suru = authorRaw.match(/([一-龥ぁ-んァ-ヶA-Za-z・\s]+?)\s*撮影/);
    if (suru) return suru[1].trim();
    const shashin = authorRaw.match(/(?:その他|著・文[^一-龥ぁ-んァ-ヶ]*)([一-龥ぁ-んァ-ヶA-Za-z・\s]+?)\s*写真/);
    if (shashin) return shashin[1].replace(/^(その他|著・文[^一-龥ぁ-んァ-ヶ]*)/, '').trim();
    return null;
  })();

  // 標題：og:title 優先，去站名「 - 徳間書店」
  const ogTitle = html.match(/property="og:title"[^>]+content="([^"]+)"/)?.[1];
  const titleTag = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const rawTitle = (ogTitle || titleTag || '').replace(/\s+/g, ' ').trim();
  const bookTitle = rawTitle.split(/[-｜|]/)[0].trim() || rawTitle;

  // 書名必須含寫真集字樣，否則視作誤判（繪本/小說）
  if (!/写真集/.test(bookTitle)) return null;

  // 女優名：優先從書名「xxx写真集」前綴提取（最可靠）；
  // 退回著者欄「著」前段（徳間格式）
  let actressName: string | null = null;
  const titleActress = bookTitle.match(/^(.+?)写真集/);
  if (titleActress && titleActress[1]) {
    let raw = titleActress[1].trim();
    // 「Pause 神宮寺ナオ」這類副標＋人名：取含日文漢字/假名嘅最後一段
    const parts = raw.split(/\s+/).filter(Boolean);
    const jpPart = parts.filter((p) => /[一-龥ぁ-んァ-ヶ]/.test(p));
    if (jpPart.length) raw = jpPart[jpPart.length - 1];
    actressName = raw;
  } else {
    const first = authorRaw.split(/著・文|著/)[0]?.replace(/撮影|写真/g, '').trim();
    if (first && !/撮影|写真/.test(first)) actressName = first || null;
  }

  const coverUrl = html.match(/property="og:image"[^>]+content="([^"]+)"/)?.[1] ?? null;
  const title = actressName ? `${actressName}写真集 ${bookTitle}`.trim() : bookTitle;

  return {
    isbn,
    title,
    bookTitle,
    actressName,
    photographer,
    publisher,
    coverUrl,
    sourceUrl,
    releaseDate,
    priceJpy,
  };
}

export type HondanaCandidate = NonNullable<ReturnType<typeof parseProduct>>;

export async function fetchHondanaPhotobooks(opts: {
  publishers?: HondanaPublisher[];
  limitPerPublisher?: number;
} = {}): Promise<{ items: HondanaCandidate[]; errors: Array<{ source: string; error: string }> }> {
  const pubs = opts.publishers ?? HONDANA_PUBLISHERS;
  const items: HondanaCandidate[] = [];
  const errors: Array<{ source: string; error: string }> = [];
  const seen = new Set<string>();

  for (const pub of pubs) {
    let productUrls: string[] = [];
    try {
      productUrls = await collectProductUrls(pub);
    } catch (e) {
      errors.push({ source: pub.key, error: e instanceof Error ? e.message : String(e) });
      continue;
    }
    if (opts.limitPerPublisher) productUrls = productUrls.slice(0, opts.limitPerPublisher);

    for (const url of productUrls) {
      try {
        const html = await fetchHtml(url);
        const cand = parseProduct(html, url, pub.publisher);
        if (cand && !seen.has(cand.isbn)) {
          seen.add(cand.isbn);
          items.push(cand);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/HTTP 404/.test(msg)) continue;
        errors.push({ source: url, error: msg });
      }
    }
  }
  items.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
  return { items, errors };
}
