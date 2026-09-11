'use client';

import { useState } from 'react';
import { Send, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// 粉絲補充活動資料表單（2026-09-11）
// 公開提交 → event_submissions(pending) → Felix 喺 /admin/event-submissions 批核
const EMPTY = { eventDate: '', actressName: '', location: '', content: '', sourceUrl: '', contact: '' };

export default function EventSubmissionForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const r = await fetch('/api/event-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        setStatus('error');
        setMessage(d.error || '提交失敗，請稍後再試');
        return;
      }
      setStatus('ok');
      setMessage(d.message || '收到！');
      setForm(EMPTY);
    } catch {
      setStatus('error');
      setMessage('網絡錯誤，請稍後再試');
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-[rgba(var(--color-nadeshiko),0.3)] bg-[rgba(var(--color-sakura),0.25)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-[56px]"
      >
        <span className="text-xl">📮</span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-text-primary">見到我哋冇收錄嘅活動？補充俾我哋</span>
          <span className="block text-xs text-text-tertiary mt-0.5">女優見面會／攝影會／簽名會⋯填低資料，管理員批核後即上架</span>
        </span>
        {open ? <ChevronUp className="w-5 h-5 text-text-tertiary shrink-0" /> : <ChevronDown className="w-5 h-5 text-text-tertiary shrink-0" />}
      </button>

      {open && (
        <form onSubmit={submit} className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">活動日期 <span className="text-danger">*</span></span>
              <input
                type="date" required value={form.eventDate} onChange={set('eventDate')}
                className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">女優 <span className="text-danger">*</span></span>
              <input
                type="text" required value={form.actressName} onChange={set('actressName')}
                placeholder="日文原名最好，例：七嶋舞"
                className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))]"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">地點 <span className="text-danger">*</span></span>
            <input
              type="text" required value={form.location} onChange={set('location')}
              placeholder="例：JKF Studio｜臺北市中山區民生東路三段…"
              className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">內容 <span className="text-danger">*</span></span>
            <textarea
              required value={form.content} onChange={set('content')} rows={3}
              placeholder="活動名稱／環節／票價／時間等，愈詳細愈好"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))] resize-y"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">資料來源連結／TG 群組</span>
              <input
                type="text" value={form.sourceUrl} onChange={set('sourceUrl')}
                placeholder="https://… 或 t.me/…"
                className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">你的聯絡（選填）</span>
              <input
                type="text" value={form.contact} onChange={set('contact')}
                placeholder="TG / email，有疑問先搵到你"
                className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))]"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-[rgb(var(--color-nadeshiko-dark))] text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition"
            >
              {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              提交補充
            </button>
            {status === 'ok' && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> {message}
              </span>
            )}
            {status === 'error' && <span className="text-sm text-danger">{message}</span>}
          </div>
          <p className="text-[11px] text-text-tertiary">提交後需經管理員核實批核先會顯示，請勿提交虛假資料。</p>
        </form>
      )}
    </div>
  );
}
