'use client';

import { useState, useCallback } from 'react';
import { Bell, BellRing, X } from 'lucide-react';

interface FollowButtonProps {
  actressId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function FollowButton({ actressId, size = 'md', className = '' }: FollowButtonProps) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [hk, setHk] = useState(true);
  const [tw, setTw] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [tgLinking, setTgLinking] = useState(false);

  const tgOneTap = useCallback(async () => {
    setErr('');
    setTgLinking(true);
    try {
      const region = [hk ? 'hk' : '', tw ? 'taiwan' : ''].filter(Boolean).join(',') || 'hk';
      const res = await fetch('/api/fan/bind-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actress_id: actressId, region_pref: region }),
      });
      const d = await res.json();
      if (!res.ok || !d.deeplink) throw new Error(d.error || 'failed');
      window.open(d.deeplink, '_blank', 'noopener,noreferrer');
      setFollowing(true);
      setDone(true);
    } catch {
      setErr('開啟 Telegram 失敗，請稍後再試');
    } finally {
      setTgLinking(false);
    }
  }, [actressId, hk, tw]);

  const close = useCallback(() => { setOpen(false); setErr(''); setDone(false); }, []);
  const sizeClasses = size === 'sm' ? 'text-xs gap-1 px-2 py-1' : 'text-sm gap-2 px-4 py-2';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center ${sizeClasses} rounded-full transition-[transform,background-color,color,border-color] duration-base ease-out active:scale-[0.94] ${
          following
            ? 'bg-[rgb(var(--color-nadeshiko-dark))] text-white border border-[rgb(var(--color-nadeshiko-dark))]'
            : 'bg-white text-[rgb(var(--color-umenezumi-light))] border border-[rgba(var(--color-sakura-gray),0.6)] hover:border-[rgb(var(--color-nadeshiko-dark))] hover:text-[rgb(var(--color-nadeshiko-dark))]'
        } ${className}`}
        aria-label="港台場 Telegram 通知"
      >
        {following ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
        {size === 'md' && <span className="text-[10px] opacity-90">{following ? '已追蹤' : '港台場通知'}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[rgb(var(--color-umenezumi-light))]">🔔 港台場 Telegram 通知</h3>
                <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--color-umenezumi-light))]/70">
                  呢位女優一有香港／台灣活動，就由 @jching_calendar_bot 第一時間通知你。
                </p>
              </div>
              <button onClick={close} className="text-[rgb(var(--color-umenezumi-light))]/50 hover:text-[rgb(var(--color-umenezumi-light))]" aria-label="關閉">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!done ? (
              <div className="mt-4 space-y-4">
                <div className="flex gap-4 text-xs text-[rgb(var(--color-umenezumi-light))]">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={hk} onChange={(e) => setHk(e.target.checked)} /> 香港場
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tw} onChange={(e) => setTw(e.target.checked)} /> 台灣場
                  </label>
                </div>
                {err && <p className="text-xs text-red-500" role="alert">{err}</p>}
                <button
                  type="button"
                  onClick={tgOneTap}
                  disabled={tgLinking}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-nadeshiko-strong))] to-[rgb(var(--color-nadeshiko-dark))] py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-300/30 transition-all hover:shadow-pink-400/40 active:scale-[0.98] disabled:opacity-50"
                >
                  {tgLinking ? '開啟中…' : '✈️ 一鍵用 Telegram 訂閱'}
                </button>
                <p className="text-center text-[10px] text-[rgb(var(--color-umenezumi-light))]/50">只用作呢位女優嘅活動通知。</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="rounded-lg bg-[rgba(var(--color-sakura),0.55)] p-3 text-sm leading-relaxed text-[rgb(var(--color-umenezumi))]" role="status">
                  已開啟 Telegram。請喺 @jching_calendar_bot 撳 <strong>Start</strong>，先完成訂閱。
                </p>
                <button onClick={close} className="w-full rounded-full border border-[rgba(var(--color-sakura-gray),0.6)] py-2 text-sm font-bold text-[rgb(var(--color-umenezumi-light))]">完成</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
