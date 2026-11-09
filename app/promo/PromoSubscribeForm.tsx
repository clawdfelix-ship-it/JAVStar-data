'use client';

import { useState } from 'react';

declare global {
  interface Window {
    fbq?: (command: string, eventName: string, parameters?: Record<string, unknown>, options?: { eventID?: string }) => void;
  }
}

export default function PromoSubscribeForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [eventId, setEventId] = useState('');

  async function subscribe() {
    const id = crypto.randomUUID();
    setEventId(id);
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/fan/bind-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'site', region_pref: 'hk,taiwan' }),
      });
      const data = await response.json();
      if (!response.ok || !data.deeplink) throw new Error(data.error || '開啟 Telegram 失敗，請稍後再試');
      window.fbq?.('track', 'Lead', {}, { eventID: id });
      window.open(data.deeplink, '_blank', 'noopener,noreferrer');
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '網絡錯誤，請稍後再試');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-[rgba(var(--color-nadeshiko),0.2)] bg-[rgba(var(--color-sakura),0.55)] p-5 text-center" role="status" data-event-id={eventId}>
        <div className="text-2xl" aria-hidden>✈️</div>
        <p className="mt-2 font-bold text-[#2F4053]">已開啟 @jching_calendar_bot</p>
        <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--color-umenezumi-light))]">請喺 Telegram 撳 <strong>Start</strong> 完成訂閱。之後最新活動週曆同公佈消息會直接送到你 Telegram。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={subscribe}
        disabled={status === 'loading'}
        className="h-12 w-full rounded-xl bg-gradient-to-r from-[rgb(var(--color-nadeshiko-strong))] to-[rgb(var(--color-nadeshiko-dark))] px-6 text-base font-bold text-white shadow-lg shadow-pink-300/30 transition-all hover:shadow-pink-400/40 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100"
      >
        {status === 'loading' ? '開啟 Telegram 中…' : '✈️ 免費用 Telegram 訂閱'}
      </button>
      {status === 'error' && <p className="text-sm font-medium text-[rgb(var(--color-wine))]" role="alert">{message}</p>}
      <p className="text-xs leading-relaxed text-[rgb(var(--color-umenezumi-light))]">只用作 JCHING 活動通知；唔會出售你嘅資料。</p>
    </div>
  );
}
