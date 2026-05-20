'use client';

import { useState, useEffect } from 'react';

interface DvdRankingItem {
  rank: number;
  title: string;
  actress: string;
  maker: string;
  videoCode: string;
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
        setRanking(data.data.slice(0, 20)); // 顯示頭 20 位
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
        return <span className="text-green-500 text-sm">↑</span>;
      case 'down':
        return <span className="text-red-500 text-sm">↓</span>;
      case 'new':
        return <span className="text-pink-500 text-xs">NEW</span>;
      default:
        return <span className="text-gray-400 text-sm">→</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <section className="py-6 px-4 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* 標題區 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-xl">🏆</span>
              月間DVD排行榜
              <span className="text-xs font-normal text-text-secondary ml-2">
                DMM MONTHLY RANKING TOP 20
              </span>
            </h2>
            <p className="text-text-tertiary mt-0.5 text-xs">
              數據來源：DMM.co.jp 月間銷售排行榜（高清封面）
            </p>
          </div>
          <a
            href="https://www.dmm.co.jp/mono/dvd/-/ranking/=/term=monthly/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600 transition-colors"
          >
            完整排行榜 →
          </a>
        </div>

        {/* 加載中 */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 排行榜網格 - 1排5個，純封面 */}
        {!isLoading && ranking.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {ranking.map((item) => (
              <a
                key={item.rank}
                href={item.detailUrl || 'https://www.dmm.co.jp/mono/dvd/-/ranking/=/term=monthly/'}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-gray-50 rounded overflow-hidden hover:shadow transition-all duration-200"
              >
                {/* 封面 - 高清渲染優化 */}
                <div 
                  className="relative overflow-hidden bg-gray-200"
                  style={{ aspectRatio: '800/438' }}
                  title={`#${item.rank} ${item.title}${item.actress ? ` | ${item.actress}` : ''}`}
                >
                  {/* 排位徽章 */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm shadow ${getRankStyle(item.rank)}`}>
                      {item.rank}
                    </span>
                  </div>
                  {/* 升降徽章 */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="px-1.5 py-0.5 bg-white/90 rounded">
                      {getRankChangeIcon(item.rankChange)}
                    </span>
                  </div>
                  {/* NEW標籤 */}
                  {item.isNew && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs font-bold">
                        NEW
                      </span>
                    </div>
                  )}
                  {/* 高清封面圖 - 渲染優化 */}
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      decoding="async"
                      style={{
                        imageRendering: 'auto',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="text-xl text-gray-400">🎬</span>
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 沒有數據 */}
        {!isLoading && ranking.length === 0 && (
          <div className="text-center py-8">
            <span className="text-3xl mb-2 block">📦</span>
            <p className="text-text-secondary text-xs">暫時無法獲取排行榜數據</p>
            <p className="text-text-tertiary text-[10px] mt-0.5">請稍後再試</p>
          </div>
        )}

        {/* 備註 */}
        <div className="mt-3 text-center">
          <p className="text-[9px] text-text-tertiary">
            🔄 數據每 4 小時自動更新 | 🖼️ 高清封面
          </p>
        </div>
      </div>
    </section>
  );
}
