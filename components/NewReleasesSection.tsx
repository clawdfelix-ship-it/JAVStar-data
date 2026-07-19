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
    `/api/new-releases?page=${page}&limit=${showAll ? 60 : 24}`,
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
    <section className="py-10 px-4 bg-bg-secondary">
      <div className="max-w-7xl mx-auto">
        {/* 標題區 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">🆕</span>
              每月新作
              <span className="text-xs font-normal text-text-secondary ml-2">
                NEW RELEASES
              </span>
            </h2>
            <p className="text-text-tertiary mt-1 text-xs">
              最新日本 AV 新作速遞 • 數據來源：JavLibrary
            </p>
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1.5 bg-accent-red text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
          >
            {showAll ? '收起' : '顯示全部'}
          </button>
        </div>

        {/* 加載中 */}
        {isValidating && releases.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-red"></div>
          </div>
        )}

        {/* 影片網格 - 細尺寸 */}
        {releases.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {releases.map((release: NewRelease) => (
              <a
                key={release.id}
                href={release.detail_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-primary rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* 封面 */}
                <div className="relative aspect-[2/3] overflow-hidden bg-gray-800">
                  {release.cover_url ? (
                    <img
                      src={release.cover_url}
                      alt={release.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-2xl">🎬</span>
                    </div>
                  )}
                  {/* 影片編號徽章 */}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white font-mono truncate max-w-full">
                    {release.video_code}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 空狀態 */}
        {!isValidating && releases.length === 0 && (
          <div className="text-center py-8 bg-bg-primary rounded-xl">
            <span className="text-4xl mb-3 block">📦</span>
            <p className="text-text-secondary text-sm">暫無新作數據</p>
            <p className="text-text-tertiary text-xs mt-1">管理員正在爬取最新數據...</p>
          </div>
        )}

        {/* 分頁 */}
        {!showAll && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 bg-bg-primary rounded text-text-tertiary disabled:opacity-50 hover:bg-bg-tertiary transition-colors text-xs"
            >
              上一頁
            </button>
            <span className="text-text-tertiary text-xs">
              第 {page} 頁 / 共 {pagination.totalPages} 頁
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
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
