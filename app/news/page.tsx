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

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = category ? `?category=${category}&limit=100` : '?limit=100';
    fetch(`/api/news${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setItems(data.data || []))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [category]);

  const categories = [...new Set(items.map((item) => item.category))];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">女優情報</h1>
        <p className="mt-1 text-sm text-gray-500">
          收錄日本 AV／寫真媒體公開情報，只顯示已審核內容，點標題前往原文。
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`rounded-full border px-3 py-1 text-sm ${!category ? 'bg-black text-white' : 'bg-white'}`}
        >
          全部
        </button>
        {categories.map((key) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`rounded-full border px-3 py-1 text-sm ${category === key ? 'bg-black text-white' : 'bg-white'}`}
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
    <article className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      {item.image_url && (
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-28 sm:w-40">
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
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          <span>{item.source_name}</span>
          {item.is_adult && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-500">18+</span>}
          <time>{formatDate(item.published_at)}</time>
        </div>
        <h2 className="font-semibold leading-snug">
          <a href={item.source_url} target="_blank" rel="noreferrer noopener" className="hover:underline">
            {item.title}
          </a>
        </h2>
        {(item.summary_zh || item.summary_ja) && (
          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-gray-600">
            {item.summary_zh || item.summary_ja}
          </p>
        )}
        {item.title_zh && item.title_ja && item.title_ja !== item.title && (
          <p className="mt-1.5 line-clamp-1 text-[11px] text-gray-400">{item.title_ja}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={item.source_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
          >
            查看日文原文
          </a>
          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-700 hover:bg-pink-100"
          >
            怎樣用瀏覽器翻譯？
          </button>
        </div>

        {showTips && (
          <div className="mt-2 rounded-lg border border-pink-200 bg-pink-50/60 p-3 text-[11px] leading-relaxed text-gray-700">
            <p className="mb-1.5 font-semibold text-text-primary">原文係日文，點一下就可以用瀏覽器翻譯：</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <b>Chrome / Edge</b>：撳地址列右邊嘅「文A」圖示 → 選「繁體中文」。
              </li>
              <li>
                <b>Safari</b>：撳底部「Aa」→「顯示翻譯」→「繁體中文」。
              </li>
              <li>
                <b>手機 Chrome</b>：撳右上角「⋮」→「翻譯」。
              </li>
            </ul>
            <p className="mt-1.5 text-gray-500">
              提示：第一次撳可能需要等幾秒 Google 翻譯載入；翻譯後整頁都會變中文。
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
