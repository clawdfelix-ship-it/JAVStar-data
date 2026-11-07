'use client';

import { FormEvent, useState } from 'react';

declare global {
  interface Window {
    fbq?: (command: string, eventName: string, parameters?: Record<string, unknown>, options?: { eventID?: string }) => void;
  }
}

export default function PromoSubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [eventId, setEventId] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setStatus('error');
      setMessage('請輸入有效 email');
      return;
    }
    const id = crypto.randomUUID();
    setEventId(id);
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, source: 'promo', event_id: id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '訂閱失敗，請稍後再試');
      window.fbq?.('track', 'Lead', {}, { eventID: id });
      setStatus('success');
      setMessage(data.message || '已訂閱！');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '網絡錯誤，請稍後再試');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-[#c9a24b]/40 bg-[#f5efe4] p-5 text-center" role="status" data-event-id={eventId}>
        <div className="text-2xl" aria-hidden>✓</div>
        <p className="mt-2 font-bold text-[#1c1a17]">{message}</p>
        <p className="mt-1 text-sm text-[#6f675c]">最新活動週曆同公佈消息，會直接送到你 inbox。</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="promo-email" className="block text-sm font-bold text-[#1c1a17]">Email 地址</label>
      <input
        id="promo-email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        disabled={status === 'loading'}
        className="h-14 w-full rounded-lg border border-[#c9a24b]/50 bg-white px-4 text-base text-[#1c1a17] outline-none transition-colors placeholder:text-[#8a8175] focus:border-[#a8842f] focus:ring-2 focus:ring-[#c9a24b]/20"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="h-14 w-full rounded-lg bg-[#1c1a17] px-6 text-base font-bold text-[#f5efe4] transition-colors hover:bg-[#785b1d] active:bg-[#1c1a17] disabled:cursor-wait disabled:opacity-60"
      >
        {status === 'loading' ? '訂閱中…' : '免費訂閱活動通知'}
      </button>
      {status === 'error' && <p className="text-sm font-medium text-[#9b352d]" role="alert">{message}</p>}
      <p className="text-xs leading-relaxed text-[#6f675c]">只用作 JCHING 活動通知，可隨時取消；唔會出售你嘅資料。</p>
    </form>
  );
}
