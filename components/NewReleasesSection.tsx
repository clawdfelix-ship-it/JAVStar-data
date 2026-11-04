'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';

interface Photobook {
  isbn: string;
  book_title: string;
  actress_name: string | null;
  photographer: string | null;
  publisher: string;
  cover_url: string | null;
  source_url: string | null;
  release_date: string | null;
  price_jpy: number | null;
  order_note: string | null;
}

// JCHING 只做目錄，唔喺站內收成人貨款；「我要訂」跳 WhatsApp，FPS／轉數快喺對話處理。
const ORDER_BASE =
  process.env.NEXT_PUBLIC_ORDER_LINK || 'https://wa.me/85295514133';

function orderHref(b: Photobook): string {
  const text = encodeURIComponent(
    `想訂寫真集：${b.actress_name ? b.actress_name + ' ' : ''}《${b.book_title}》（ISBN ${b.isbn}）`
  );
  // t.me / wa.me 支援 ?text 預填訊息；其他連結就直接去 ORDER_BASE
  return /(t\.me|wa\.me)\//.test(ORDER_BASE)
    ? `${ORDER_BASE}?text=${text}`
    : ORDER_BASE;
}

function fmtMonth(d: string | null): string {
  if (!d) return '';
  const m = d.slice(0, 7).split('-');
  return `${m[0]}年${Number(m[1])}月`;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewReleasesSection() {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || page === 1) return;
    requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }, [page]);

  const { data, error, isValidating } = useSWR(
    `/api/photobooks?page=${page}&page_size=${showAll ? 60 : 24}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const books: Photobook[] = data?.data || [];
  const pagination = data?.pagination || {};

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">❌ 加載失敗，請稍後再試</div>
    );
  }

  return (
    <section ref={sectionRef} className="py-10 px-4 bg-bg-secondary">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">📚</span>
              女優寫真集
              <span className="text-xs font-normal text-text-secondary ml-2">
                PHOTOBOOKS
              </span>
            </h2>
            <p className="text-text-tertiary mt-1 text-xs">
              日本 AV 女優寫真集新刊速遞 • 數據來源：版元ドットコム（hanmoto）
            </p>
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1.5 bg-accent-red text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
          >
            {showAll ? '收起' : '顯示全部'}
          </button>
        </div>
        <p className="text-text-tertiary text-[11px] mb-6">
          目錄參考用；想訂貨請點「我要訂」透過 WhatsApp 聯絡，FPS／轉數快付款，順豐到付或自取。
        </p>

        {isValidating && books.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-red"></div>
          </div>
        )}

        {books.length > 0 && (
          <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 scrollbar-hide">
            {books.map((b) => (
              <div
                key={b.isbn}
                className="group snap-start shrink-0 w-32 sm:w-36 md:w-auto flex flex-col bg-bg-primary rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <a
                  href={b.source_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${b.actress_name ?? ''}《${b.book_title}》`}
                  className="block relative aspect-[2/3] overflow-hidden bg-gray-800"
                >
                  {b.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.cover_url}
                      alt={`${b.actress_name ?? ''} ${b.book_title}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                    {!b.cover_url && <span className="text-2xl">📕</span>}
                  </div>
                  {b.release_date && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white">
                      {fmtMonth(b.release_date)}
                    </div>
                  )}
                </a>
                <div className="px-1.5 py-1.5 flex flex-col gap-0.5">
                  {b.actress_name && (
                    <p className="text-[11px] font-semibold text-text-primary truncate">
                      {b.actress_name}
                    </p>
                  )}
                  <p className="text-[10px] text-text-secondary line-clamp-2 leading-tight">
                    {b.book_title}
                  </p>
                  <a
                    href={orderHref(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-center text-[10px] font-medium text-accent-red hover:underline"
                  >
                    我要訂 →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isValidating && books.length === 0 && (
          <div className="text-center py-8 bg-bg-primary rounded-xl">
            <span className="text-4xl mb-3 block">📚</span>
            <p className="text-text-secondary text-sm">暫無寫真集資料</p>
            <p className="text-text-tertiary text-xs mt-1">管理員正在更新最新書目...</p>
          </div>
        )}

        {!showAll && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 bg-bg-primary rounded text-text-tertiary disabled:opacity-50 hover:bg-bg-tertiary transition-colors text-xs"
            >
              上一頁
            </button>
            <span className="text-text-tertiary text-xs">
              第 {page} 頁 / 共 {pagination.totalPages} 頁
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-2.5 py-1 bg-bg-primary rounded text-text-tertiary disabled:opacity-50 hover:bg-bg-tertiary transition-colors text-xs"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
