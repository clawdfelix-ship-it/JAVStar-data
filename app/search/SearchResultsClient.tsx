'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flower2 } from 'lucide-react';
import ActressSearchBox from '@/components/ActressSearchBox';
import ActressCard from '@/components/ActressCard';
import { useActresses } from '@/hooks/useActresses';

function Results({ q, page, setPage }: { q: string; page: number; setPage: (p: number) => void }) {
  const { actresses, pagination, loading, error } = useActresses({
    page,
    limit: 20,
    sort: 'final_score',
    search: q,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-danger text-center py-10">載入失敗，請稍後重試。</p>;
  }
  if (!actresses.length) {
    return (
      <div className="fdb-card p-10 md:p-14 text-center max-w-md mx-auto">
        <div className="text-5xl mb-4 flex justify-center" aria-hidden>
          <Flower2 className="w-8 h-8 text-pink-400" />
        </div>
        <p className="text-lg font-semibold text-text-primary mb-2">搵唔到「{q}」相關女優</p>
        <p className="text-sm text-text-secondary">試下日文原名、假名、羅馬字或者其他別名。</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-text-secondary mb-4">
        共 <span className="font-bold text-text-primary">{pagination?.total ?? actresses.length}</span> 個結果
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {actresses.map((a, i) => (
          <ActressCard key={a.id} {...a} rank={i + 1 + (page - 1) * 20} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="fdb-btn fdb-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />上一頁
          </button>
          <span className="px-4 py-2 text-text-secondary">
            第 {page} 頁 / 共 {pagination.totalPages} 頁
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page >= pagination.totalPages}
            className="fdb-btn fdb-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一頁<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

function SearchResultsInner({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [page, setPage] = useState(1);

  // URL query 變更時同步（typeahead push / 瀏覽器前後）
  useEffect(() => {
    setQ(initialQuery);
    setPage(1);
  }, [initialQuery]);

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 pb-28">
      <button
        onClick={() => router.push('/')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-[rgb(var(--color-wine))] mb-5"
      >
        <ChevronLeft className="w-4 h-4" /> 返回首頁
      </button>
      <h1 className="text-2xl font-bold text-text-primary mb-5">搜尋女優</h1>

      <div className="max-w-xl mb-8">
        <ActressSearchBox variant="page" autoFocus={!initialQuery} />
      </div>

      {q ? (
        <Results q={q} page={page} setPage={setPage} />
      ) : (
        <p className="text-text-secondary text-center py-10">打關鍵字開始搜尋（日文名、假名、羅馬字都得）。</p>
      )}
    </main>
  );
}

export default function SearchResultsClient({ initialQuery }: { initialQuery: string }) {
  return (
    <Suspense fallback={null}>
      <SearchResultsInner initialQuery={initialQuery} />
    </Suspense>
  );
}
