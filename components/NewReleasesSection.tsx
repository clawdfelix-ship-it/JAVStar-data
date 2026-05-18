'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface NewRelease {
  id: string;
  video_code: string;
  title: string;
  cover_url: string | null;
  detail_url: string | null;
  actresses: string | null;
  release_date: string | null;
  maker: string | null;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function NewReleasesSection() {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const { data, error, isValidating } = useSWR(
    `/api/new-releases?page=${page}&limit=${showAll ? 40 : 8}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 分鐘
    }
  );

  const releases = data?.data || [];
  const pagination = data?.pagination || {};

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        ❌ 加載失敗，請稍後再試
      </div>
    );
  }

  return (
    <section className="py-12 px-4 bg-bg-secondary">
      <div className="max-w-7xl mx-auto">
        {/* 標題區 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-3">
              <span className="text-3xl">🆕</span>
              每月新作
              <span className="text-sm font-normal text-text-secondary ml-2">
                NEW RELEASES
              </span>
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              最新日本 AV 新作速遞 • 數據來源：JavLibrary
            </p>
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            {showAll ? '收起' : '顯示全部'}
          </button>
        </div>

        {/* 加載中 */}
        {isValidating && releases.length === 0 && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-red"></div>
          </div>
        )}

        {/* 影片網格 */}
        {releases.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {releases.map((release: NewRelease) => (
              <a
                key={release.id}
                href={release.detail_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-primary rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* 封面 */}
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-800">
                  {release.cover_url ? (
                    <img
                      src={release.cover_url}
                      alt={release.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-4xl">🎬</span>
                    </div>
                  )}
                  {/* 影片編號徽章 */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-mono">
                    {release.video_code}
                  </div>
                </div>

                {/* 標題 */}
                <div className="p-3">
                  <h3 className="text-xs text-text-primary line-clamp-2 leading-tight">
                    {release.title}
                  </h3>
                  {release.actresses && (
                    <p className="text-[10px] text-accent-red mt-1 truncate">
                      {release.actresses}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 空狀態 */}
        {!isValidating && releases.length === 0 && (
          <div className="text-center py-12 bg-bg-primary rounded-xl">
            <span className="text-5xl mb-4 block">📦</span>
            <p className="text-text-secondary">暫無新作數據</p>
            <p className="text-text-tertiary text-sm mt-1">管理員正在爬取最新數據...</p>
          </div>
        )}

        {/* 分頁 */}
        {!showAll && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-bg-primary rounded text-text-secondary disabled:opacity-50 hover:bg-bg-tertiary transition-colors text-sm"
            >
              上一頁
            </button>
            <span className="text-text-secondary text-sm">
              第 {page} 頁 / 共 {pagination.totalPages} 頁
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 bg-bg-primary rounded text-text-secondary disabled:opacity-50 hover:bg-bg-tertiary transition-colors text-sm"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
