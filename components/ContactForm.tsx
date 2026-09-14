'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

const TOPICS = ['合作查詢', '廣告贊助', '活動聯辦', '其他'];

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', contact: '', topic: '合作查詢', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [err, setErr] = useState('');

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErr('');
    try {
      const r = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || '提交失敗，請稍後再試');
        setStatus('error');
        return;
      }
      setStatus('ok');
    } catch {
      setErr('網絡錯誤，請稍後再試');
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="text-base font-bold text-text-primary mb-1">收到！</p>
        <p className="text-sm text-text-secondary">我哋會盡快透過你填嘅聯絡方法回覆。</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[rgba(var(--color-sakura-gray),0.7)] bg-white p-5 md:p-6">
      {/* 蜜罐（人類唔會填） */}
      <input
        type="text"
        value={form.website}
        onChange={set('website')}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          稱呼 / 品牌 <span className="text-text-tertiary font-normal">（選填）</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          maxLength={120}
          placeholder="例如：XX 活動公司"
          className="w-full min-h-[44px] px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko-dark))]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          聯絡方法 <span className="text-red-500">*</span>
          <span className="text-text-tertiary font-normal">（Email / Telegram / WhatsApp / 電話）</span>
        </label>
        <input
          type="text"
          value={form.contact}
          onChange={set('contact')}
          required
          maxLength={200}
          placeholder="等我哋搵到你"
          className="w-full min-h-[44px] px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko-dark))]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">查詢類型</label>
        <select
          value={form.topic}
          onChange={set('topic')}
          className="w-full min-h-[44px] px-4 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko-dark))]"
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">
          查詢內容 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.message}
          onChange={set('message')}
          required
          minLength={5}
          maxLength={3000}
          rows={5}
          placeholder="簡單講明：品牌／公司、想推廣嘅產品或活動、目標檔期同預算"
          className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko-dark))] resize-y"
        />
      </div>

      {status === 'error' && <p className="text-sm text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-nadeshiko-strong))] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {status === 'loading' ? '遞交中…' : '遞交查詢'}
      </button>
    </form>
  );
}
