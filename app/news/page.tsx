'use client';

import { useEffect, useState } from 'react';
import { AGE_GATE_EVENT, isAgeConfirmedToday } from '@/lib/ageGate';

type NewsItem = {
  id: number;
  source_name: string;
  source_url: string;
  title: string;
  title_ja: string | null;
  title_zh: string | null;
  summary_ja: string | null;
  summary_zh: string | null;
  image_url: string | null;
  category: string;
  is_adult: boolean;
  published_at: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  news: '情報',
  industry: '業界',
  interview: '專訪',
  gravure: '寫真',
  release: '新作',
  event_report: '活動回顧',
  debut_retire: '出道/引退',
  entertainment: '藝能',
};

function formatDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-Hant-HK', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const PAGE_SIZE = 10;

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  // Reset to first page whenever the category filter changes.
  useEffect(() => {
    setPage(1);
  }, [category]);

  // Lightweight fetch of all category keys (ids only would be ideal, but the feed
  // only returns rows; use a large limit solely to derive the chip list).
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/news?limit=200`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const keys = [...new Set((data.data || []).map((x: NewsItem) => x.category))] as string[];
        setCategories(keys);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (category) qs.set('category', category);
    fetch(`/api/news?${qs.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setItems(data.data || []);
        setTotalPages(data.total_pages || 1);
        setTotal(data.total ?? (data.data || []).length);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [category, page]);

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">女優情報</h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          收錄日本 AV／寫真媒體公開情報，只顯示已審核內容，點標題前往原文。
        </p>
      </div>

      <div className="mb-4 -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <button
          onClick={() => setCategory('')}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap sm:text-sm ${!category ? 'bg-black text-white' : 'bg-white'}`}
        >
          全部
        </button>
        {categories.map((key) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap sm:text-sm ${category === key ? 'bg-black text-white' : 'bg-white'}`}
          >
            {CATEGORY_LABEL[key] || key}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">載入中…</p>}
      {error && <p className="text-red-500">載入失敗：{error}</p>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">
          暫時未有已發布情報
        </div>
      )}

      <div className="grid gap-3">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {!loading && !error && totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="新聞分頁">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一頁
          </button>
          <span className="tabular-nums text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一頁
          </button>
          <span className="ml-1 hidden text-xs text-gray-400 sm:inline">共 {total} 篇</span>
        </nav>
      )}
    </main>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  // Adult covers are blurred until either:
  //  (a) the visitor confirmed the global 18+ age gate today, or
  //  (b) they tap this specific cover.
  const [gateOk, setGateOk] = useState(false);
  const [manual, setManual] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const sync = () => setGateOk(isAgeConfirmedToday());
    sync();
    window.addEventListener(AGE_GATE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AGE_GATE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const revealed = gateOk || manual;
  const blurred = item.is_adult && !revealed;

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md sm:flex-row sm:gap-4 sm:p-4">
      {item.image_url && (
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:aspect-auto sm:h-28 sm:w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition duration-300 ${blurred ? 'scale-110 blur-2xl' : ''}`}
          />
          {blurred && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setManual(true);
              }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/35 text-[11px] font-semibold text-white"
            >
              <span className="rounded bg-red-600 px-1.5 py-0.5">18+</span>
              <span>點擊顯示封面</span>
            </button>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          <span>{item.source_name}</span>
          {item.is_adult && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-500">18+</span>}
          <time>{formatDate(item.published_at)}</time>
        </div>
        <h2 className="text-[15px] font-semibold leading-snug sm:text-base">
          <a href={item.source_url} target="_blank" rel="noreferrer noopener" className="hover:underline">
            {item.title}
          </a>
        </h2>
        {(item.summary_zh || item.summary_ja) && (
          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-gray-600 sm:mt-2 sm:line-clamp-4 sm:text-sm">
            {item.summary_zh || item.summary_ja}
          </p>
        )}
        {item.title_zh && item.title_ja && item.title_ja !== item.title && (
          <p className="mt-1.5 line-clamp-1 text-[11px] text-gray-400">{item.title_ja}</p>
        )}

        <div className="mt-2.5 flex items-center gap-3 sm:mt-3">
          <a
            href={item.source_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          >
            打開原文 ↗
          </a>
          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="text-[11px] font-medium text-pink-600 underline-offset-2 hover:text-pink-800 hover:underline"
          >
            {showTips ? '收合翻譯提示' : '用瀏覽器翻譯？'}
          </button>
        </div>

        {showTips && (
          <div className="mt-2 rounded-lg border border-pink-200 bg-pink-50/60 p-3 text-[11px] leading-relaxed text-gray-700">
            <p className="mb-1.5 font-semibold text-text-primary">原文係日文，點一下就可以用瀏覽器翻譯：</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <b>Chrome / Edge（電腦）</b>：撳地址列右邊嘅「文A」圖示 → 選「繁體中文」。
              </li>
              <li>
                <b>Safari（iPhone）</b>：撳左下角「Aa」→「顯示翻譯」→「繁體中文」。
              </li>
              <li>
                <b>Chrome（手機）</b>：撳右上角「⋮」→「翻譯」。
              </li>
            </ul>
            <p className="mt-1.5 text-gray-500">
              第一次撳可能要等幾秒，翻譯後整頁都會變中文。
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
