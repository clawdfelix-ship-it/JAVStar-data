'use client';

import { useState, useEffect, useCallback } from 'react';

interface VoteButtonProps {
  actressId: string;
  initialCount: number;
  size?: 'sm' | 'md';
  className?: string;
}

export default function VoteButton({ actressId, initialCount, size = 'md', className = '' }: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check initial vote status
  useEffect(() => {
    fetch(`/api/actresses/${actressId}/vote`)
      .then(r => r.json())
      .then(d => {
        setHasVoted(d.has_voted || false);
        setVoteCount(d.vote_count || initialCount);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [actressId, initialCount]);

  const handleVote = useCallback(async () => {
    if (loading || checking) return;
    setLoading(true);

    try {
      if (hasVoted) {
        // Remove vote
        const res = await fetch(`/api/actresses/${actressId}/vote`, { method: 'DELETE' });
        const d = await res.json();
        if (res.ok) {
          setHasVoted(false);
          setVoteCount(d.vote_count ?? Math.max(0, voteCount - 1));
        }
      } else {
        // Cast vote
        const res = await fetch(`/api/actresses/${actressId}/vote`, { method: 'POST' });
        const d = await res.json();
        if (res.ok) {
          setHasVoted(true);
          setVoteCount(d.vote_count ?? voteCount + 1);
        } else {
          alert(d.error || '投票失敗');
        }
      }
    } catch {
      alert('網絡錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [actressId, hasVoted, loading, voteCount]);

  const sizeClasses = size === 'sm'
    ? 'text-xs gap-1 px-2 py-1'
    : 'text-sm gap-2 px-4 py-2';

  if (checking) {
    return (
      <button className={`flex items-center ${sizeClasses} rounded-full border border-[rgba(var(--color-sakura-gray),0.6)] text-[rgb(var(--color-umenezumi-light))] bg-white cursor-wait ${className}`} disabled>
        <span className="animate-pulse">♡</span>
        <span>{voteCount}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`flex items-center ${sizeClasses} rounded-full transition-all duration-200 ${
        hasVoted
          ? 'bg-[rgb(var(--color-nadeshiko-dark))] text-white border border-[rgb(var(--color-nadeshiko-dark))] hover:bg-[rgb(var(--color-nadeshiko))]'
          : 'bg-white text-[rgb(var(--color-umenezumi-light))] border border-[rgba(var(--color-sakura-gray),0.6)] hover:border-[rgb(var(--color-nadeshiko-dark))] hover:text-[rgb(var(--color-nadeshiko-dark))]'
      } ${loading ? 'opacity-50 cursor-wait' : ''} ${className}`}
    >
      <span className={`text-base leading-none ${hasVoted ? 'scale-110' : ''} transition-transform`}>
        {hasVoted ? '♥' : '♡'}
      </span>
      <span className="font-bold">{voteCount}</span>
      {size === 'md' && (
        <span className="text-[10px] opacity-80">{hasVoted ? '已投' : '投票'}</span>
      )}
    </button>
  );
}