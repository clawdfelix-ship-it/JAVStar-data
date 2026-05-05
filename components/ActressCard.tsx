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
    <div className="actress-card fade-in w-full">
      <Link href={`/actress/${id}`} className="block w-full">
        {/* Card Header with Avatar & Rank */}
        <div className="relative">
          {/* Avatar */}
          <div className="actress-avatar relative">
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={name_ja}
                className="actress-avatar"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="actress-avatar flex items-center justify-center text-text-secondary text-4xl font-japanese bg-gradient-to-br from-bg-tertiary to-border">
                {(name_ja || '?')[0]}
              </div>
            )}
            
            {/* Rank Badge - positioned absolute */}
            <div className="absolute top-3 left-3">
              <div className={`rank-badge ${getRankClass(rank)} shadow-lg`}>
                {rank}
              </div>
            </div>

            {/* Score Badge - top right */}
            <div className="absolute top-3 right-3">
              <div className="fdb-badge-primary text-sm font-mono font-bold py-1.5 px-3 shadow-lg">
                {final_score} pts
              </div>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="actress-info">
          {/* Name */}
          <h3 className="actress-name text-line-clamp-1">
            {name_ja}
          </h3>
          {name_cn && (
            <p className="text-small text-text-secondary line-clamp-1">{name_cn}</p>
          )}

          {/* Key Stats Row */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {age && (
              <span className="fdb-badge-primary">
                {age}歲
              </span>
            )}
            {zodiac && (
              <span className="fdb-badge-purple">
                {zodiac}
              </span>
            )}
            {cup && (
              <span className="fdb-badge-danger">
                {cup}
              </span>
            )}
            {height && (
              <span className="fdb-badge-success">
                {height}cm
              </span>
            )}
          </div>

          {/* Measurements */}
          {bust && waist && hip && (
            <div className="mt-2 flex items-center gap-1 text-small text-text-secondary font-mono">
              <span className="fdb-badge px-2 py-0.5">
                B{bust} W{waist} H{hip}
              </span>
            </div>
          )}

          {/* Agency & Hobby */}
          <div className="flex flex-wrap gap-2 mt-3 text-small text-text-secondary">
            {agency && (
              <span className="truncate max-w-[140px] flex items-center gap-1" title={agency}>
                <span>🏢</span> {agency}
              </span>
            )}
            {hobby && (
              <span className="truncate max-w-[140px] flex items-center gap-1" title={hobby}>
                <span>🎯</span> {hobby}
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border-light">
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-primary">
                {year_2026_events}
              </div>
              <div className="text-caption text-text-secondary">活動</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-accent">
                {currentVoteCount}
              </div>
              <div className="text-caption text-text-secondary">投票</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-success">
                {debut_year || '-'}
              </div>
              <div className="text-caption text-text-secondary">出道</div>
            </div>
          </div>
        </div>
      </Link>

      {/* Card Footer Actions */}
      <div className="px-4 pb-4 pt-0 flex items-center justify-between gap-2">
        <div className="text-caption text-text-tertiary font-mono">
          #{id.slice(0, 8)}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`fdb-btn fdb-btn-sm ${
              hasVoted
                ? 'bg-gradient-to-r from-[#FF7D00] to-[#FF9500] text-white'
                : 'fdb-btn-outline'
            }`}
          >
            {isVoting ? '...' : hasVoted ? '♥ 已投' : '♡ 投票'}
          </button>

          <Link 
            href={`/actress/${id}`} 
            className="fdb-btn fdb-btn-primary fdb-btn-sm"
          >
            詳情 →
          </Link>
        </div>
      </div>
    </div>
  );
}
