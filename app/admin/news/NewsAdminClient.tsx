'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';

type NewsRow = {
  id: number;
  source_key: string;
  source_name: string;
  source_url: string;
  title_ja: string;
  title_zh: string | null;
  summary_ja: string | null;
  summary_zh: string | null;
  image_url: string | null;
  category: string;
  is_adult: boolean;
  status: string;
  translation_status: string;
  published_at: string | null;
  created_at: string;
};

const TABS = [
  { key: 'pending', label: '待審' },
  { key: 'published', label: '已發布' },
  { key: 'rejected', label: '已拒絕' },
  { key: 'all', label: '全部' },
];

const CATEGORY_LABEL: Record<string, string> = {
  news: '情報',
  industry: '業界',
  interview: '專訪',
  gravure: '寫真',
  release: '新作',
  event_report: '活動回顧',
  debut_retire: '出道/引退',
  entertainment: '藝能',
};

function Row({ row, token, onChanged }: { row: NewsRow; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: row.id, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-2xl border border-[rgba(var(--color-sakura-gray),0.7)] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold">
          {CATEGORY_LABEL[row.category] || row.category}
        </span>
        <span className="font-semibold text-text-secondary">{row.source_name}</span>
        {row.is_adult && <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-500">18+</span>}
        {row.translation_status === 'translated' ? (
          <span className="rounded-full bg-green-50 px-2 py-0.5 font-semibold text-green-600">已譯中文</span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-600">未譯</span>
        )}
        <span>{row.published_at ? new Date(row.published_at).toLocaleString('zh-HK') : '無發布時間'}</span>
        <a href={row.source_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-pink-600">
          原文 <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {row.image_url && (
        <a href={row.image_url} target="_blank" rel="noreferrer" className="mb-2 block w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.image_url}
            alt=""
            loading="lazy"
            className="h-24 w-32 rounded-lg border border-gray-200 object-cover"
          />
        </a>
      )}

      <h2 className="text-sm font-bold leading-snug text-text-primary">{row.title_zh || row.title_ja}</h2>
      {row.summary_zh && <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{row.summary_zh}</p>}
      <details className="mt-1.5 text-[11px] text-text-tertiary">
        <summary className="cursor-pointer select-none">日文原文</summary>
        <p className="mt-1 font-medium">{row.title_ja}</p>
        {row.summary_ja && <p className="mt-1 leading-relaxed">{row.summary_ja}</p>}
      </details>

      {error && <p className="mt-2 text-xs text-red-600">操作失敗：{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        {row.status !== 'published' && (
          <button
            onClick={() => act('approve')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            發布
          </button>
        )}
        {row.status !== 'rejected' && (
          <button
            onClick={() => act('reject')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            拒絕
          </button>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-text-tertiary">#{row.id} · {row.status}</span>
      </div>
    </article>
  );
}

export default function NewsAdminClient() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<NewsRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/news?status=${status}&limit=100`, { headers: { 'x-admin-token': tk } });
    if (res.status === 401) {
      setAuthed(false);
      setAuthErr('Token 唔啱');
      setRows([]);
    } else {
      const data = await res.json();
      setRows(data.items || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) load(tab, token);
  }, [authed, tab, token, load]);

  function login() {
    if (token.trim()) {
      sessionStorage.setItem('admin_token', token.trim());
      setAuthed(true);
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-pink-600" /> 女優情報審批
          </h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="admin token"
            className="mb-3 min-h-[44px] w-full rounded-xl border px-3 text-sm"
          />
          {authErr && <p className="mb-2 text-sm text-red-600">{authErr}</p>}
          <button onClick={login} className="min-h-[44px] w-full rounded-xl bg-pink-600 text-sm font-bold text-white">
            登入
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">女優情報審批</h1>
          <p className="mt-0.5 text-xs text-text-tertiary">pending 唔會公開；按「發布」先會出現喺 /news。</p>
        </div>
        <button onClick={() => load(tab, token)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> 重新整理
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              tab === t.key ? 'bg-pink-600 text-white' : 'border bg-white text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 animate-spin text-pink-500" /></div>
      ) : !rows || rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-tertiary">暫無項目</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => <Row key={row.id} row={row} token={token} onChanged={() => load(tab, token)} />)}
        </div>
      )}
    </main>
  );
}
