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
      <div className="rounded-lg border border-[#c9a24b]/40 bg-[#f5efe4] p-5 text-center" role="status" data-event-id={eventId}>
        <div className="text-2xl" aria-hidden>✈️</div>
        <p className="mt-2 font-bold text-[#1c1a17]">已開啟 @jching_calendar_bot</p>
        <p className="mt-1 text-sm leading-relaxed text-[#6f675c]">請喺 Telegram 撳 <strong>Start</strong> 完成訂閱。之後最新活動週曆同公佈消息會直接送到你 Telegram。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={subscribe}
        disabled={status === 'loading'}
        className="h-14 w-full rounded-lg bg-[#229ED9] px-6 text-base font-bold text-white transition-colors hover:bg-[#1c8bbf] active:bg-[#229ED9] disabled:cursor-wait disabled:opacity-60"
      >
        {status === 'loading' ? '開啟 Telegram 中…' : '✈️ 免費用 Telegram 訂閱'}
      </button>
      {status === 'error' && <p className="text-sm font-medium text-[#9b352d]" role="alert">{message}</p>}
      <p className="text-xs leading-relaxed text-[#6f675c]">只用作 JCHING 活動通知；唔會出售你嘅資料。</p>
    </div>
  );
}
