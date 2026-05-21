'use client';

import Link from 'next/link';

interface ActressCardProps {
  rank: number;
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  age: number | null;
  zodiac: string | null;
  cup: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  final_score: number;
}

export default function ActressCard({
  rank,
  id,
  name_ja,
  name_cn,
  avatar_url,
  age,
  cup,
  height,
  bust,
  waist,
  hip,
  event_count,
  year_2026_events,
  vote_count,
  final_score,
}: ActressCardProps) {

  // Rank styling - NIPPON COLORS
  const getRankClass = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-200';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-200';
    return 'bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-lg shadow-pink-200';
  };

  return (
    <Link href={`/actress/${id}`} className="block group">
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        {/* Avatar Section - 垂直布局 */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-pink-50 to-blue-50">
          {/* Rank Badge - 左上角 */}
          <div className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold z-10 shadow-lg ${getRankClass(rank)}`}>
            {rank}
          </div>

          {/* Score Badge - 右上角 */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-xs font-bold shadow-md z-10">
            ⭐ {final_score}
          </div>

          {/* Avatar Image */}
          {avatar_url ? (
            <img 
              src={avatar_url} 
              alt={name_ja} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl font-japanese font-bold text-pink-300">
                {name_ja[0]}
              </div>
            </div>
          )}

          {/* 底部資訊條 - 身材數據 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center justify-center gap-2 text-white text-xs">
              {age && <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded">{age}歳</span>}\n              {cup && <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded">Cup {cup}</span>}\n              {height && <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded">{height}cm</span>}\n            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4">
          {/* Name */}
          <div className="mb-3">
            <h3 className="font-japanese font-bold text-gray-900 text-lg truncate group-hover:text-pink-600 transition-colors">
              {name_ja}
            </h3>
            {name_cn && (
              <p className="text-gray-500 text-sm truncate mt-0.5">{name_cn}</p>
            )}
          </div>

          {/* Activity Stats - 三欄 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 rounded-xl bg-pink-50 border border-pink-100">
              <div className="text-xl font-bold text-pink-600">{event_count}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">總活動</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-xl font-bold text-emerald-600">{year_2026_events}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">2026 活動</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-xl font-bold text-amber-600">{vote_count}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">投票</div>
            </div>
          </div>

          {/* CTA Button */}
          <button className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-medium text-sm hover:from-pink-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg group-hover:shadow-pink-200">
            查看詳情 →
          </button>
        </div>
      </div>
    </Link>
  );
}
