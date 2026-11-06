'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';
type PbRow = {
  isbn: string;
  book_title: string;
  actress_name: string | null;
  photographer: string | null;
  publisher: string;
  title_raw: string;
  cover_url: string | null;
  source_url: string;
  release_date: string | null;
  price_jpy: number | null;
  order_note: string | null;
  status: string;
  created_at: string;
};

const TABS = [
  { key: 'pending', label: '待審' },
  { key: 'published', label: '已發布' },
  { key: 'rejected', label: '已拒絕' },
  { key: 'all', label: '全部' },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    published: 'bg-green-100 text-green-800',
    rejected: 'bg-gray-200 text-gray-600',
  };
  return map[s] || 'bg-gray-100';
}

function Row({
  row,
  token,
  onChanged,
  selected,
  onToggle,
}: {
  row: PbRow;
  token: string;
  onChanged: () => void;
  selected: boolean;
  onToggle: (isbn: string) => void;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [price, setPrice] = useState<string>(row.price_jpy != null ? String(row.price_jpy) : '');
  const [note, setNote] = useState<string>(row.order_note || '');
  const [savingMeta, setSavingMeta] = useState(false);

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/admin/photobooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ isbn: row.isbn, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveMeta() {
    setSavingMeta(true);
    setError('');
    try {
      const res = await fetch('/api/admin/photobooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          isbn: row.isbn,
          action: 'update',
          price_jpy: price ? Number(price) : null,
          order_note: note || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingMeta(false);
    }
  }

  return (
    <div className={`rounded-2xl border bg-white p-3 transition-colors ${selected ? 'border-pink-400 ring-1 ring-pink-200' : ''}`}>
      <div className="flex gap-3">
        {row.status === 'pending' && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(row.isbn)}
            aria-label={`選擇 ${row.book_title}`}
            className="mt-1 h-4 w-4 shrink-0 accent-pink-600"
          />
        )}
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {row.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.cover_url} alt={row.book_title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">📕</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-text-primary">
                {row.actress_name ? `${row.actress_name}　` : ''}
                <span className="font-normal text-text-secondary">{row.book_title}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                {row.publisher}
                {row.photographer ? `　攝：${row.photographer}` : ''}
                {row.release_date ? `　${row.release_date.slice(0, 7)}` : ''}
                {`　ISBN ${row.isbn}`}
              </p>
            </div>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge(row.status)}`}>
              {row.status}
            </span>
          </div>

          <a
            href={row.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-pink-600 hover:underline"
          >
            hanmoto 來源 <ExternalLink className="h-3 w-3" />
          </a>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-[10px] text-text-tertiary">
              日圓定價
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="如 4400"
                className="ml-1 w-20 rounded border px-1.5 py-1 text-xs"
              />
            </label>
            <label className="flex-1 text-[10px] text-text-tertiary">
              備註（可空）
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如：附特典／限量"
                className="mt-0.5 block w-full rounded border px-1.5 py-1 text-xs text-text-primary"
              />
            </label>
            <button
              onClick={saveMeta}
              disabled={savingMeta}
              className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {savingMeta ? '…' : '存'}
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => act('approve')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              發布
            </button>
            <button
              onClick={() => act('reject')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              拒絕
            </button>
            {error && <span className="self-center text-[11px] text-red-600">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhotobooksAdminClient({ embeddedToken }: { embeddedToken?: string }) {
  const [token, setToken] = useState(embeddedToken ?? '');
  const [authed, setAuthed] = useState(!!embeddedToken);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<PbRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState<'approve' | 'reject' | null>(null);
  const [batchMsg, setBatchMsg] = useState('');

  const toggle = useCallback((isbn: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(isbn)) next.delete(isbn);
      else next.add(isbn);
      return next;
    });
  }, []);

  // 切 tab／重新載入後清選擇
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  async function batchAct(action: 'approve' | 'reject') {
    const isbns = [...selected].filter((i) => /^\d{13}$/.test(i));
    if (!isbns.length) return;
    const verb = action === 'approve' ? '發布' : '拒絕';
    if (!window.confirm(`確認批量${verb} ${isbns.length} 本？（只會改 pending 項，已審項不受影響）`)) return;
    setBatchBusy(action);
    setBatchMsg('');
    try {
      const res = await fetch('/api/admin/photobooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action, isbns }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setBatchMsg(`已${verb} ${j.updated} 本${j.skipped?.length ? `，跳過 ${j.skipped.length} 本（非 pending）` : ''}`);
      clearSelection();
      await load(tab, token);
    } catch (e) {
      setBatchMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBatchBusy(null);
    }
  }

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/photobooks?status=${status}&limit=200`, {
        headers: { 'x-admin-token': tk },
      });
      if (res.status === 401) {
        setAuthErr('token 錯誤');
        setAuthed(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(j.items);
      setCounts(j.counts || {});
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      clearSelection();
      load(tab, token);
    }
  }, [authed, tab, token, load, clearSelection]);

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
            <ShieldCheck className="h-5 w-5 text-pink-600" /> 寫真集審批
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
          <h1 className="text-xl font-bold">女優寫真集審批</h1>
          <p className="mt-0.5 text-xs text-text-tertiary">pending 唔會公開；按「發布」先會出現喺首頁寫真集區。落單跳 WhatsApp。</p>
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
            {counts[t.key] != null ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 animate-spin text-pink-500" /></div>
      ) : !rows || rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-tertiary">暫無項目</p>
      ) : (
        <>
          {tab === 'pending' && (
            <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-white/95 p-2.5 backdrop-blur">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-pink-600"
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.isbn))}
                  ref={(el) => {
                    if (el) el.indeterminate = rows.some((r) => selected.has(r.isbn)) && !rows.every((r) => selected.has(r.isbn));
                  }}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(rows.map((r) => r.isbn)));
                    else clearSelection();
                  }}
                />
                全選
              </label>
              <span className="text-xs text-text-tertiary">已選 {selected.size} 本</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => batchAct('approve')}
                  disabled={batchBusy !== null || selected.size === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-40"
                >
                  {batchBusy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  批量發布
                </button>
                <button
                  onClick={() => batchAct('reject')}
                  disabled={batchBusy !== null || selected.size === 0}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-gray-50 disabled:opacity-40"
                >
                  {batchBusy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  批量拒絕
                </button>
              </div>
            </div>
          )}
          {batchMsg && <p className="mb-2 rounded-lg bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-700">{batchMsg}</p>}
          <div className="space-y-3">
            {rows.map((row) => (
              <Row
                key={row.isbn}
                row={row}
                token={token}
                onChanged={() => load(tab, token)}
                selected={selected.has(row.isbn)}
                onToggle={toggle}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
