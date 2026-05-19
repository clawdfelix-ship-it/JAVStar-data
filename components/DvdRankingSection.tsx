'use client';

import { useState, useEffect } from 'react';

interface DvdRankingItem {
  rank: number;
  title: string;
  actress: string;
  maker: string;
  coverUrl: string;
  detailUrl: string;
  isNew: boolean;
  rankChange: 'up' | 'down' | 'same' | 'new';
}

export default function DvdRankingSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [ranking, setRanking] = useState<DvdRankingItem[]>([]);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const res = await fetch('/api/dmm-ranking');
      const data = await res.json();
      if (data.success && data.data) {
        setRanking(data.data.slice(0, 8)); // 淨係顯示頭 8 位
      }
    } catch (error) {
      console.error('獲取排行榜失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankChangeIcon = (change: DvdRankingItem['rankChange']) => {
    switch (change) {
      case 'up':
        return <span className="text-green-500 text-xs">↑</span>;
      case 'down':
        return <span className="text-red-500 text-xs">↓</span>;
      case 'new':
        return <span className="text-pink-500 text-xs">NEW</span>;
      default:
        return <span className="text-gray-400 text-xs">→</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <section className="py-8 px-4 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* 標題區 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              月間DVD排行榜
              <span className="text-xs font-normal text-text-secondary ml-2">
                DMM MONTHLY RANKING
              </span>
            </h2>
            <p className="text-text-tertiary mt-1 text-sm">
              數據來源：DMM.co.jp 月間銷售排行榜
            </p>
          </div>
          <a
            href="https://www.dmm.co.jp/mono/dvd/-/ranking/=/term=monthly/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
          >
            去DMM睇完整排行榜 →
          </a>
        </div>

        {/* 加載中 */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 排行榜網格 */}
        {!isLoading && ranking.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ranking.map((item) => (
              <a
                key={item.rank}
                href={item.detailUrl || 'https://www.dmm.co.jp/mono/dvd/-/ranking/=/term=monthly/'}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* 封面 */}
                <div className="relative aspect-[2/3] overflow-hidden bg-gray-200">
                  {/* 排位徽章 */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-lg ${getRankStyle(item.rank)}`}>
                      {item.rank}
                    </span>
                  </div>
                  {/* 升降徽章 */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-1.5 py-0.5 bg-white/90 rounded text-xs">
                      {getRankChangeIcon(item.rankChange)}
                    </span>
                  </div>
                  {/* NEW標籤 */}
                  {item.isNew && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="px-2 py-0.5 bg-pink-500 text-white rounded text-[10px] font-bold">
                        NEW
                      </span>
                    </div>
                  )}
                  {/* 封面圖 */}
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="text-4xl text-gray-400">🎬</span>
                    </div>
                  )}
                </div>

                {/* 資訊 */}
                <div className="p-3">
                  <h3 className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  {item.actress && (
                    <p className="text-[10px] text-pink-600 mt-1 font-medium">
                      {item.actress}
                    </p>
                  )}
                  {item.maker && (
                    <p className="text-[9px] text-text-tertiary mt-0.5">
                      {item.maker}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 沒有數據 */}
        {!isLoading && ranking.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-3 block">📦</span>
            <p className="text-text-secondary text-sm">暫時無法獲取排行榜數據</p>
            <p className="text-text-tertiary text-xs mt-1">請稍後再試，或直接去 DMM 網站睇</p>
          </div>
        )}

        {/* 備註 */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-text-tertiary">
            🔄 數據每 1 小時自動更新
          </p>
        </div>
      </div>
    </section>
  );
}
