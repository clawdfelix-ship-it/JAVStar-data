'use client';

import { useState, useCallback } from 'react';
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

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-default';
}

export default function ActressCard({
  rank,
  id,
  name_ja,
  name_cn,
  avatar_url,
  age,
  zodiac,
  cup,
  height,
  bust,
  waist,
  hip,
  agency,
  hobby,
  debut_year,
  year_2026_events,
  vote_count,
  final_score,
}: ActressCardProps) {
  const [currentVoteCount, setCurrentVoteCount] = useState(vote_count);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isVoting) return;
    setIsVoting(true);

    try {
      if (hasVoted) {
        const res = await fetch(`/api/actresses/${id}/vote`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          setHasVoted(false);
          setCurrentVoteCount(Math.max(0, currentVoteCount - 1));
        } else {
          alert(data.error || '收回投票失敗');
        }
      } else {
        const res = await fetch(`/api/actresses/${id}/vote`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          setHasVoted(true);
          setCurrentVoteCount(currentVoteCount + 1);
          alert(data.message || '投票成功！多謝支持 🎉');
        } else {
          alert(data.error || '投票失敗');
        }
      }
    } catch {
      alert('網絡錯誤，請稍後再試');
    } finally {
      setIsVoting(false);
    }
  }, [id, isVoting, hasVoted, currentVoteCount]);

  return (
    <div className="fdb-card hover:shadow-lg transition-all duration-300">
      <Link href={`/actress/${id}`} className="block">
        {/* Top Section: Avatar + Basic Info - COMPACT */}
        <div className="p-4 flex items-start gap-4">
          {/* Avatar - Smaller */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt={name_ja}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-2xl font-japanese font-bold text-pink-500">
                  {(name_ja || '?')[0]}
                </span>
              )}
            </div>
            
            {/* Rank Badge - Smaller */}
            <div className={`absolute -top-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
              rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
              rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
              rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
              'bg-gradient-to-br from-pink-400 to-pink-600'
            }`}>
              {rank}
            </div>
          </div>

          {/* Info - Tighter spacing */}
          <div className="flex-1 min-w-0">
            {/* Name + Score */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-japanese font-bold text-text-primary text-base leading-tight truncate">
                  {name_ja}
                </h3>
                {name_cn && (
                  <p className="text-xs text-text-secondary truncate mt-0.5">{name_cn}</p>
                )}
              </div>
              <span className="fdb-badge-primary flex-shrink-0 text-xs font-mono font-bold">
                {final_score}
              </span>
            </div>

            {/* Tags - More compact */}
            <div className="flex flex-wrap gap-1 mt-2">
              {age && <span className="fdb-badge text-xs py-0.5 px-2">{age}歲</span>}
              {cup && <span className="fdb-badge-danger text-xs py-0.5 px-2">{cup}</span>}
              {height && <span className="fdb-badge-success text-xs py-0.5 px-2">{height}cm</span>}
              {bust && waist && hip && (
                <span className="fdb-badge text-xs py-0.5 px-2 font-mono">
                  {bust}-{waist}-{hip}
                </span>
              )}
            </div>

            {/* Agency & Hobby - Compact */}
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-tertiary">
              {agency && (
                <span className="truncate max-w-[120px] flex items-center gap-1" title={agency}>
                  🏢 {agency}
                </span>
              )}
              {hobby && (
                <span className="truncate max-w-[120px] flex items-center gap-1" title={hobby}>
                  🎯 {hobby}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar - Very compact */}
        <div className="grid grid-cols-3 gap-px bg-border-light">
          <div className="bg-bg-secondary py-2.5 px-3 text-center">
            <div className="font-mono text-base font-bold text-primary-dark">
              {year_2026_events}
            </div>
            <div className="text-[10px] text-text-secondary">活動</div>
          </div>
          <div className="bg-bg-secondary py-2.5 px-3 text-center">
            <div className="font-mono text-base font-bold text-warning">
              {currentVoteCount}
            </div>
            <div className="text-[10px] text-text-secondary">投票</div>
          </div>
          <div className="bg-bg-secondary py-2.5 px-3 text-center">
            <div className="font-mono text-base font-bold text-success">
              {debut_year || '-'}
            </div>
            <div className="text-[10px] text-text-secondary">出道</div>
          </div>
        </div>
      </Link>

      {/* Footer - Compact */}
      <div className="p-3 pt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-text-tertiary font-mono">
          #{id.slice(0, 8)}
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasVoted
                ? 'bg-gradient-to-r from-warning to-[#FF9500] text-white shadow-md'
                : 'bg-bg-tertiary text-text-secondary hover:bg-pink-100 hover:text-pink-600'
            }`}
          >
            {isVoting ? '...' : hasVoted ? '♥ 已投' : '♡ 投票'}
          </button>

          <Link 
            href={`/actress/${id}`} 
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-primary-dark to-primary text-white shadow-md hover:shadow-lg transition-all"
          >
            詳情 →
          </Link>
        </div>
      </div>
    </div>
  );
}
