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
    return 'bg-gradient-to-br from-nadeshiko-light to-nadeshiko text-white';
  };

  return (
    <Link href={`/actress/${id}`} className="block">
      <div className="fdb-card p-4 h-full">
        <div className="flex gap-4">
          {/* Avatar Section */}
          <div className="relative flex-shrink-0">
            {/* Rank Badge */}
            <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${getRankClass(rank)}`}>
              {rank}
            </div>

            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-nadeshiko-light/50 to-kamenozoki/30 flex items-center justify-center">
              {avatar_url ? (
                <img src={avatar_url} alt={name_ja} className="w-full h-full object-cover" />
              ) : (
                <div className="text-3xl font-japanese font-bold text-nadeshiko-dark">
                  {name_ja[0]}
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            {/* Name + Score */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-japanese font-bold text-text-primary text-base truncate">
                  {name_ja}
                </h3>
                {name_cn && (
                  <p className="text-text-tertiary text-xs truncate">{name_cn}</p>
                )}
              </div>
              <div className="fdb-badge fdb-badge-primary flex-shrink-0">
                {final_score}
              </div>
            </div>

            {/* Key Stats */}
            <div className="flex flex-wrap gap-2 mb-3">
              {age && (
                <span className="text-xs px-2 py-1 rounded-lg bg-sakura-gray/30 text-text-secondary">
                  {age}歳
                </span>
              )}
              {cup && (
                <span className="text-xs px-2 py-1 rounded-lg bg-nadeshiko-light/20 text-nadeshiko-dark font-semibold">
                  Cup {cup}
                </span>
              )}
              {height && (
                <span className="text-xs px-2 py-1 rounded-lg bg-sakura-gray/30 text-text-secondary">
                  {height}cm
                </span>
              )}
              {bust && waist && hip && (
                <span className="text-xs px-2 py-1 rounded-lg bg-sakura-gray/30 text-text-secondary font-mono">
                  {bust}-{waist}-{hip}
                </span>
              )}
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center px-2 py-1.5 rounded-lg bg-emerald-50">
                <div className="text-emerald-600 font-bold text-sm">{year_2026_events}</div>
                <div className="text-text-tertiary text-[10px]">2026活動</div>
              </div>
              <div className="text-center px-2 py-1.5 rounded-lg bg-kamenozoki/20">
                <div className="text-kamenozoki-dark font-bold text-sm">{vote_count}</div>
                <div className="text-text-tertiary text-[10px]">投票</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
