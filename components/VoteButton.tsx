'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';

interface VoteButtonProps {
  actressId: string;
  initialCount: number;
  /**
   * 由 list/detail API 一齊帶返嚟嘅「我今個月有冇投過」。
   * 有呢個 prop 就唔再各自打 GET /vote（殺列表 N+1 request storm）；
   * 淨係喺冇傳（例如獨立掛載）先 fallback 去 fetch。
   */
  initialVoted?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function VoteButton({ actressId, initialCount, initialVoted, size = 'md', className = '' }: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(!!initialVoted);
  const [loading, setLoading] = useState(false);
  // 只有冇 external 狀態傳入時先需要自己 check
  const [checking, setChecking] = useState(initialVoted === undefined);

  // Fallback：獨立使用（冇 initialVoted）先打 GET
  useEffect(() => {
    if (initialVoted !== undefined) {
      setHasVoted(initialVoted);
      setVoteCount(initialCount);
      setChecking(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/actresses/${actressId}/vote`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setHasVoted(d.has_voted || false);
        setVoteCount(d.vote_count ?? initialCount);
        setChecking(false);
      })
      .catch(() => !cancelled && setChecking(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actressId, initialVoted]);

  // 外部數據刷新（翻頁/輪詢）時同步
  useEffect(() => { setVoteCount(initialCount); }, [initialCount]);
  useEffect(() => { if (initialVoted !== undefined) setHasVoted(initialVoted); }, [initialVoted]);

  const handleVote = useCallback(async () => {
    if (loading || checking) return;
    setLoading(true);

    try {
      if (hasVoted) {
        // 收回本月投票
        const res = await fetch(`/api/actresses/${actressId}/vote`, { method: 'DELETE' });
        const d = await res.json();
        if (res.ok) {
          setHasVoted(false);
          setVoteCount(d.vote_count ?? Math.max(0, voteCount - 1));
        } else {
          alert(d.error || '操作失敗');
        }
      } else {
        const res = await fetch(`/api/actresses/${actressId}/vote`, { method: 'POST' });
        const d = await res.json();
        if (res.ok) {
          setHasVoted(true);
          setVoteCount(d.vote_count ?? voteCount + 1);
        } else if (d.voted) {
          // 呢個月已投過 — 同步狀態
          setHasVoted(true);
          alert(d.error || '你呢個月已投過');
        } else {
          alert(d.error || '投票失敗');
        }
      }
    } catch {
      alert('網絡錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [actressId, hasVoted, loading, checking, voteCount]);

  const sizeClasses = size === 'sm'
    ? 'text-xs gap-1 px-2 py-1'
    : 'text-sm gap-2 px-4 py-2';

  if (checking) {
    return (
      <button className={`flex items-center ${sizeClasses} rounded-full border border-[rgba(var(--color-sakura-gray),0.6)] text-[rgb(var(--color-umenezumi-light))] bg-white cursor-wait ${className}`} disabled aria-label="載入投票中">
        <Heart className="w-3.5 h-3.5 opacity-40" />
        <span>{voteCount}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      title={hasVoted ? '收回呢個月嘅投票' : '每月可以投一次'}
      className={`flex items-center ${sizeClasses} rounded-full transition-[transform,background-color,color,border-color] duration-base ease-out active:scale-[0.94] disabled:active:scale-100 ${
        hasVoted
          ? 'bg-[rgb(var(--color-nadeshiko-strong))] text-white border border-[rgb(var(--color-nadeshiko-strong))] hover:bg-[rgb(var(--color-nadeshiko-dark))]'
          : 'bg-white text-[rgb(var(--color-umenezumi-light))] border border-[rgba(var(--color-sakura-gray),0.6)] hover:border-[rgb(var(--color-nadeshiko-dark))] hover:text-[rgb(var(--color-nadeshiko-dark))]'
      } ${loading ? 'opacity-50 cursor-wait' : ''} ${className}`}
    >
      <Heart
        className={`w-3.5 h-3.5 leading-none transition-transform ${hasVoted ? 'fill-current text-white vote-heart-bump' : 'text-[rgb(var(--color-umenezumi-light))]'}`}
      />
      <span key={voteCount} className="font-bold vote-count">{voteCount}</span>
      {size === 'md' && (
        <span className="text-[10px] opacity-80">{hasVoted ? '已投·本月' : '本月投票'}</span>
      )}
    </button>
  );
}
