'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ActressCardProps {
  rank: number;
  id: string;
  name_ja: string;
  name_cn: string;
  avatar_url: string | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  final_score: number;
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'bg-border text-text-secondary';
}

export default function ActressCard({
  rank,
  id,
  name_ja,
  name_cn,
  avatar_url,
  event_count,
  year_2026_events,
  vote_count,
  final_score,
}: ActressCardProps) {
  const [currentVoteCount, setCurrentVoteCount] = useState(vote_count);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  async function handleVote(e: React.MouseEvent) {
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
  }

  return (
    <div className="actress-card bg-secondary rounded-lg p-4 border border-border hover:border-accent">
      <Link href={`/actress/${id}`} className="block">
        <div className="flex items-center gap-4">
          {/* Rank badge */}
          <div className={`rank-badge ${getRankClass(rank)}`}>
            {rank}
          </div>

          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary overflow-hidden flex-shrink-0">
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={name_ja}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary text-2xl font-japanese">
                {name_ja[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-japanese text-lg font-semibold text-text-primary truncate">
              {name_ja}
            </h3>
            {name_cn && (
              <p className="text-text-secondary text-sm truncate">
                {name_cn}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-2xl font-bold text-accent">
              {final_score}
            </div>
            <div className="text-text-secondary text-xs">
              總分
            </div>
            <div className="flex gap-3 mt-1 justify-end">
              <span className="text-success text-xs" title="年度活動">
                📅 {year_2026_events}
              </span>
              <span className="text-accent text-xs" title="投票數">
                ♥ {currentVoteCount}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Vote button */}
      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
        <span className="text-text-secondary text-sm">
          ID: {id}
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              hasVoted
                ? 'bg-accent text-white hover:bg-accent/80'
                : 'bg-primary border border-accent text-accent hover:bg-accent hover:text-white'
            } disabled:opacity-50`}
          >
            {isVoting ? '處理中...' : hasVoted ? '♥ 已投' : '♡ 投票'}
          </button>

          <Link href={`/actress/${id}`} className="text-accent text-sm hover:underline">
            睇詳情 →
          </Link>
        </div>
      </div>
    </div>
  );
}
