'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, X } from 'lucide-react';

interface FollowButtonProps {
  actressId: string;
  size?: 'sm' | 'md';
  className?: string;
}

const TOKEN_KEY = 'jching_fan_token';

function getFanToken(): string {
  if (typeof window === 'undefined') return '';
  let t = localStorage.getItem(TOKEN_KEY) || '';
  if (!t) {
    t = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

// remember last-used contact for convenience
const CONTACT_KEY = 'jching_contact';

export default function FollowButton({ actressId, size = 'md', className = '' }: FollowButtonProps) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tg, setTg] = useState('');
  const [ig, setIg] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<'tg' | 'ig' | 'email'>('tg');
  const [hk, setHk] = useState(true);
  const [tw, setTw] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}');
      if (c.tg) setTg(c.tg);
      if (c.ig) setIg(c.ig);
      if (c.email) setEmail(c.email);
      if (c.channel) setChannel(c.channel);
    } catch { /* noop */ }
  }, []);

  const close = useCallback(() => { setOpen(false); setErr(''); setDone(false); }, []);

  const submit = useCallback(async () => {
    setErr('');
    const body: Record<string, unknown> = {
      actress_id: actressId,
      fan_token: getFanToken(),
      channel_pref: [channel, hk ? '' : '', tw ? '' : ''].filter(Boolean).join(',') || channel,
      region_pref: [hk ? 'hk' : '', tw ? 'taiwan' : ''].filter(Boolean).join(',') || 'hk',
    };
    if (channel === 'tg') {
      if (!tg.trim()) { setErr('請填 Telegram username 或電話'); return; }
      body.tg_handle = tg.trim();
    } else if (channel === 'ig') {
      if (!ig.trim()) { setErr('請填 Instagram username'); return; }
      body.ig_handle = ig.trim();
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('請填有效 Email'); return; }
      body.email = email.trim();
    }
    setLoading(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '設定失敗，請稍後再試'); return; }
      try {
        localStorage.setItem(CONTACT_KEY, JSON.stringify({ tg, ig, email, channel }));
      } catch { /* noop */ }
      setFollowing(true);
      setDone(true);
    } catch {
      setErr('網絡錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [actressId, channel, tg, ig, email, hk, tw]);

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
        aria-label="港台場通知"
      >
        {following ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
        {size === 'md' && <span className="text-[10px] opacity-90">{following ? '已追蹤' : '港台場通知'}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[rgb(var(--color-umenezumi-light))]">
                  {following ? '🔔 通知已開啟' : '🔔 港台場通知我'}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--color-umenezumi-light))]/70">
                  {following
                    ? '呢位女優一有香港/台灣見面會，會用你揀嘅渠道第一時間通知你。'
                    : '呢位女優一有香港/台灣見面會，就用你揀嘅渠道第一時間通知你。唔會發其他嘢。'}
                </p>
              </div>
              <button onClick={close} className="text-[rgb(var(--color-umenezumi-light))]/50 hover:text-[rgb(var(--color-umenezumi-light))]" aria-label="關閉">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!done ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  {([['tg', 'Telegram'], ['ig', 'Instagram'], ['email', 'Email']] as const).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setChannel(v)}
                      className={`flex-1 rounded-full border px-2 py-1.5 text-xs transition ${
                        channel === v
                          ? 'border-[rgb(var(--color-nadeshiko-dark))] bg-[rgb(var(--color-nadeshiko-dark))] text-white'
                          : 'border-[rgba(var(--color-sakura-gray),0.6)] text-[rgb(var(--color-umenezumi-light))]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {channel === 'tg' && (
                  <input
                    value={tg}
                    onChange={(e) => setTg(e.target.value)}
                    placeholder="@username 或電話"
                    className="w-full rounded-lg border border-[rgba(var(--color-sakura-gray),0.6)] px-3 py-2 text-sm outline-none focus:border-[rgb(var(--color-nadeshiko-dark))]"
                  />
                )}
                {channel === 'ig' && (
                  <input
                    value={ig}
                    onChange={(e) => setIg(e.target.value)}
                    placeholder="@instagram"
                    className="w-full rounded-lg border border-[rgba(var(--color-sakura-gray),0.6)] px-3 py-2 text-sm outline-none focus:border-[rgb(var(--color-nadeshiko-dark))]"
                  />
                )}
                {channel === 'email' && (
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[rgba(var(--color-sakura-gray),0.6)] px-3 py-2 text-sm outline-none focus:border-[rgb(var(--color-nadeshiko-dark))]"
                  />
                )}

                <div className="flex gap-4 text-xs text-[rgb(var(--color-umenezumi-light))]">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={hk} onChange={(e) => setHk(e.target.checked)} /> 香港場
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tw} onChange={(e) => setTw(e.target.checked)} /> 台灣場
                  </label>
                </div>

                {err && <p className="text-xs text-red-500">{err}</p>}

                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full rounded-full bg-[rgb(var(--color-nadeshiko-dark))] py-2 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? '設定中…' : '開啟通知'}
                </button>
                <p className="text-center text-[10px] text-[rgb(var(--color-umenezumi-light))]/50">
                  只用作活動通知，可隨時取消。
                </p>
              </div>
            ) : (
              <button
                onClick={close}
                className="mt-4 w-full rounded-full border border-[rgba(var(--color-sakura-gray),0.6)] py-2 text-sm font-bold text-[rgb(var(--color-umenezumi-light))]"
              >
                完成
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
