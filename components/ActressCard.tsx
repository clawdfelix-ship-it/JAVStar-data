'use client';

import Link from 'next/link';
import VoteButton from './VoteButton';

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

  const getRankClass = (r: number) => {
    if (r === 1) return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200';
    if (r === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-200';
    if (r === 3) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-200';
    return 'bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-lg shadow-pink-200';
  };

  return (
    <div className="relative bg-[#16213e] rounded-xl border border-[#2a2a4a] shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      {/* Rank Badge */}
      <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg ${getRankClass(rank)}`}>
        {rank}
      </div>

      {/* Score Badge */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-[10px] font-bold shadow-md z-10">
        ⭐ {final_score}
      </div>

      {/* Avatar */}
      <Link href={`/actress/${id}`} className="block">
        <div className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-pink-900/20 to-blue-900/20">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name_ja}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-[#2a2a4a]">{name_ja[0]}</div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f0f1a] to-transparent p-2">
            <div className="flex items-center justify-center gap-1.5 text-white text-[10px]">
              {age && <span className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">{age}歳</span>}
              {cup && <span className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">C{cup}</span>}
              {height && <span className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">{height}</span>}
            </div>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <div className="mb-2.5">
          <Link href={`/actress/${id}`}>
            <h3 className="font-bold text-[#eaeaea] text-base truncate group-hover:text-[#e94560] transition-colors" style={{fontFamily: 'Noto Sans JP, sans-serif'}}>
              {name_ja}
            </h3>
          </Link>
          {name_cn && <p className="text-[#6c6c8a] text-xs truncate mt-0.5">{name_cn}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          <div className="text-center p-1.5 rounded-lg bg-[#0f0f1a] border border-[#2a2a4a]">
            <div className="text-base font-bold text-[#e94560]">{event_count}</div>
            <div className="text-[9px] text-[#6c6c8a] uppercase tracking-wider">活動</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-[#0f0f1a] border border-[#2a2a4a]">
            <div className="text-base font-bold text-[#4ade80]">{year_2026_events}</div>
            <div className="text-[9px] text-[#6c6c8a] uppercase tracking-wider">2026</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-[#0f0f1a] border border-[#2a2a4a]">
            <div className="text-base font-bold text-[#fbbf24]">{vote_count}</div>
            <div className="text-[9px] text-[#6c6c8a] uppercase tracking-wider">投票</div>
          </div>
        </div>

        {/* Vote + CTA Row */}
        <div className="flex items-center gap-2">
          <VoteButton actressId={id} initialCount={vote_count} size="sm" className="flex-1 justify-center" />
          <Link href={`/actress/${id}`} className="flex-1 py-1.5 bg-[#e94560] hover:bg-[#c73a52] text-white rounded-lg font-medium text-xs text-center transition-colors shadow-md">
            詳情 →
          </Link>
        </div>
      </div>
    </div>
  );
}