'use client';

import { useState } from 'react';

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

// 模擬數據（真實數據需要後端爬蟲）
const mockRanking: DvdRankingItem[] = [
  {
    rank: 1,
    title: '初めての真正中出し解禁 河北彩花',
    actress: '河北彩花',
    maker: 'S1 NO.1 STYLE',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/ssis00001/ssis00001ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=ssis00001/',
    isNew: true,
    rankChange: 'new',
  },
  {
    rank: 2,
    title: '新人NO.1 STYLE 渚ことみ AVデビュー',
    actress: '渚ことみ',
    maker: 'S1 NO.1 STYLE',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/ssis00002/ssis00002ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=ssis00002/',
    isNew: true,
    rankChange: 'up',
  },
  {
    rank: 3,
    title: '100万円プレステージ 神木キャンペーン',
    actress: '神木キャンペーン',
    maker: 'PRESTIGE',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/abp00001/abp00001ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=abp00001/',
    isNew: false,
    rankChange: 'same',
  },
  {
    rank: 4,
    title: '絶対的美少女、最高のセックス 三上悠亜',
    actress: '三上悠亜',
    maker: 'S1 NO.1 STYLE',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/ssis00003/ssis00003ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=ssis00003/',
    isNew: false,
    rankChange: 'down',
  },
  {
    rank: 5,
    title: '初撮り 本物素人 20歳 女子大生',
    actress: '素人',
    maker: 'ナンパJAPAN',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/nnpj00001/nnpj00001ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=nnpj00001/',
    isNew: true,
    rankChange: 'new',
  },
  {
    rank: 6,
    title: '専属NO.1 STYLE 明里つむぎ',
    actress: '明里つむぎ',
    maker: 'IPZZ',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/ipzz00001/ipzz00001ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=ipzz00001/',
    isNew: false,
    rankChange: 'up',
  },
  {
    rank: 7,
    title: '超人気女優の最高級ソープ 桃乃木かな',
    actress: '桃乃木かな',
    maker: 'MOODYZ',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/mide00001/mide00001ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=mide00001/',
    isNew: false,
    rankChange: 'same',
  },
  {
    rank: 8,
    title: '最高の美女と、最高のセックス。 深田えいみ',
    actress: '深田えいみ',
    maker: 'MAXING',
    coverUrl: 'https://pics.dmm.co.jp/mono/movie/adult/mxgs00001/mxgs00001ps.jpg',
    detailUrl: 'https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=mxgs00001/',
    isNew: false,
    rankChange: 'down',
  },
];

export default function DvdRankingSection() {
  const [isLoading] = useState(false);

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
              數據來源：DMM.co.jp 月間銷售排行榜</p>
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
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mockRanking.map((item) => (
              <a
                key={item.rank}
                href={item.detailUrl}
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
                  {/* 封面圖（暫時用占位符，真實數據需要爬蟲 */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-4xl text-gray-400">🎬</span>
                  </div>
                </div>

                {/* 資訊 */}
                <div className="p-3">
                  <h3 className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-pink-600 mt-1 font-medium">
                    {item.actress}
                  </p>
                  <p className="text-[9px] text-text-tertiary mt-0.5">
                    {item.maker}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 備註 */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-text-tertiary">
            ⚠️ 目前顯示為模擬數據，真實數據需要後台爬蟲功能
          </p>
        </div>
      </div>
    </section>
  );
}
