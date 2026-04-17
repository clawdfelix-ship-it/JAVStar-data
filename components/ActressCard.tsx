'use client';

import { useState } from 'react';
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
  return 'bg-border text-text-secondary';
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary rounded text-xs text-text-secondary">
      <span className="text-text-secondary/60">{label}</span>
      <span className="text-accent font-medium">{value}</span>
    </span>
  );
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
    <div className="actress-card bg-secondary rounded-lg p-3 md:p-4 border border-border hover:border-accent">
      <Link href={`/actress/${id}`} className="block">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Rank badge */}
          <div className={`rank-badge flex-shrink-0 ${getRankClass(rank)}`}>
            {rank}
          </div>

          {/* Avatar */}
          <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-primary overflow-hidden flex-shrink-0 ring-2 ring-border hover:ring-accent hover:ring-4 transition-all duration-300 shadow-lg hover:shadow-accent/30">
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
            <h3 className="font-japanese text-base md:text-xl font-bold text-text-primary truncate">
              {name_ja}
            </h3>
            {name_cn && (
              <p className="text-text-secondary text-sm truncate">{name_cn}</p>
            )}

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {age && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-xs rounded-md font-medium">
                  {age}歲
                </span>
              )}
              {zodiac && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-md">
                  {zodiac}
                </span>
              )}
              {cup && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-500/10 text-pink-400 text-xs rounded-md font-mono">
                  {cup} cup
                </span>
              )}
              {height && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md">
                  📏 {height}cm
                </span>
              )}
            </div>

            {/* Measurements */}
            {bust && waist && hip && (
              <div className="text-text-secondary/70 text-xs mt-1 font-mono">
                B{bust} / W{waist} / H{hip}
              </div>
            )}

            {/* Agency & hobby */}
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-secondary">
              {agency && (
                <span className="truncate max-w-[120px]" title={agency}>🏢 {agency}</span>
              )}
              {hobby && (
                <span className="truncate max-w-[120px]" title={hobby}>🎯 {hobby}</span>
              )}
            </div>
          </div>

          {/* Score + mini stats */}
          <div className="hidden sm:flex flex-col items-end justify-between flex-shrink-0">
            <div>
              <div className="font-mono text-xl md:text-2xl font-bold text-accent">
                {final_score}
              </div>
              <div className="text-text-secondary text-xs">總分</div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-success" title="年度活動">📅 {year_2026_events}</span>
              <span className="text-accent" title="投票數">♥ {currentVoteCount}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Footer: debut year + actions */}
      <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {debut_year && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs rounded-md font-medium">
              🎬 出道 {debut_year}
            </span>
          )}
          <span className="text-text-secondary/50 text-xs font-mono">#{id.slice(0, 8)}</span>
          <div className="sm:hidden flex items-center gap-1 text-xs">
            <span className="text-accent font-mono font-bold">{final_score}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleVote}
            disabled={isVoting}
            className={`px-3 py-2 sm:py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
              hasVoted
                ? 'bg-accent text-white hover:bg-accent/80'
                : 'bg-primary border border-accent text-accent hover:bg-accent hover:text-white'
            } disabled:opacity-50`}
          >
            {isVoting ? '處理中...' : hasVoted ? '♥ 已投' : '♡ 投票'}
          </button>

          <Link href={`/actress/${id}`} className="text-accent text-sm hover:underline py-2 min-h-[44px] flex items-center">
            詳情 →
          </Link>
        </div>
      </div>
    </div>
  );
}
