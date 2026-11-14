'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, RefreshCw } from 'lucide-react';

type FanPhotoRow = {
  id: number;
  actress_id: string;
  event_id: string | null;
  blob_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  submitter_contact: string;
  submitter_name: string | null;
  ip: string | null;
  status: 'pending' | 'published' | 'rejected';
  admin_note: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
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
  row: FanPhotoRow;
  token: string;
  onChanged: () => void;
  selected: boolean;
  onToggle: (id: number) => void;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/admin/fan-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: row.id, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`rounded-2xl border bg-white p-3 ${selected ? 'border-pink-400 ring-1 ring-pink-200' : ''}`}>
      <div className="flex gap-3">
        {row.status === 'pending' && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(row.id)}
            aria-label={`選擇 #${row.id}`}
            className="mt-1 h-4 w-4 shrink-0 accent-pink-600"
          />
        )}
        <a href={row.blob_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.thumbnail_url || row.blob_url}
            alt={row.caption || `#${row.id}`}
            className="h-28 w-20 rounded-lg border object-cover"
            loading="lazy"
          />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <p className="font-bold text-text-primary">
                女優 id {row.actress_id}
                {row.event_id ? <span className="ml-2 text-xs font-normal text-text-tertiary">活動 {row.event_id}</span> : null}
              </p>
              {row.caption && <p className="mt-0.5 text-text-secondary">「{row.caption}」</p>}
              <p className="mt-1 text-[11px] text-text-tertiary">
                聯絡：{row.submitter_contact}　名稱：{row.submitter_name || '匿名粉絲'}
              </p>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                IP：{row.ip || '?'}　{row.width}×{row.height}　{row.file_size ? `${(row.file_size / 1048576).toFixed(2)}MB` : ''}　{row.created_at.slice(0, 16).replace('T', ' ')}
              </p>
              {row.admin_note && <p className="mt-1 text-[11px] text-gray-500">備註：{row.admin_note}</p>}
            </div>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge(row.status)}`}>
              {row.status}
            </span>
          </div>

          {row.status === 'pending' && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function FanPhotosAdminClient({ embeddedToken }: { embeddedToken?: string }) {
  const [token] = useState(embeddedToken ?? '');
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<FanPhotoRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchBusy, setBatchBusy] = useState<'approve' | 'reject' | null>(null);
  const [msg, setMsg] = useState('');

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const load = useCallback(
    async (status: string, tk: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/fan-photos?status=${status}`, {
          headers: { 'x-admin-token': tk },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        setRows(j.items);
        setCounts(j.counts || {});
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (token) {
      clearSelection();
      load(tab, token);
    }
  }, [token, tab, load, clearSelection]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function batchAct(action: 'approve' | 'reject') {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`確認批量${action === 'approve' ? '發布' : '拒絕'} ${ids.length} 張？（只改 pending）`)) return;
    setBatchBusy(action);
    setMsg('');
    try {
      const res = await fetch('/api/admin/fan-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action, ids }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setMsg(`已處理 ${j.updated} 張${j.skipped?.length ? `，跳過 ${j.skipped.length} 張（非 pending）` : ''}`);
      clearSelection();
      await load(tab, token);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBatchBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              tab === t.key ? 'bg-pink-600 text-white' : 'border bg-white text-text-secondary'
            }`}
          >
            {t.label}
            {counts[t.key] != null ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
        <button onClick={() => load(tab, token)} className="ml-auto inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> 重新整理
        </button>
      </div>

      {tab === 'pending' && rows && rows.length > 0 && (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-white/95 p-2.5 backdrop-blur">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <input
              type="checkbox"
              className="h-4 w-4 accent-pink-600"
              checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
              ref={(el) => {
                if (el)
                  el.indeterminate = rows.some((r) => selected.has(r.id)) && !rows.every((r) => selected.has(r.id));
              }}
              onChange={(e) => {
                if (e.target.checked) setSelected(new Set(rows.map((r) => r.id)));
                else clearSelection();
              }}
            />
            全選
          </label>
          <span className="text-xs text-text-tertiary">已選 {selected.size} 張</span>
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

      {msg && <p className="mb-2 rounded-lg bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-700">{msg}</p>}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 animate-spin text-pink-500" /></div>
      ) : !rows || rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-tertiary">暫無項目</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              token={token}
              onChanged={() => load(tab, token)}
              selected={selected.has(row.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
