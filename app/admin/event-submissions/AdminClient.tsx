'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, X, Loader2, ShieldCheck, ExternalLink } from 'lucide-react';

interface Submission {
  id: number;
  event_date: string;
  actress_name: string;
  location: string;
  content: string;
  source_url: string | null;
  contact: string | null;
  status: string;
  admin_note: string | null;
  actress_id: string | null;
  created_event_id: string | null;
  created_at: string;
}

interface Suggestion { id: string; name_ja: string; name_cn: string | null; year_2026_events: number; }

function Row({ sub, token, onReviewed }: { sub: Submission; token: string; onReviewed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [actressId, setActressId] = useState(String(sub.actress_id || ''));
  const [kw, setKw] = useState(sub.actress_name);
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => { search(); /* 首次用女優名自動搜 */ /* eslint-disable-next-line */ }, []);

  const search = useCallback(async (term?: string) => {
    const q = (term ?? kw).trim();
    if (q.length < 1) { setSugg([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/actresses?mode=quick&search=${encodeURIComponent(q)}&limit=6`);
      const d = await r.json();
      setSugg(d.data || []);
    } catch { setSugg([]); } finally { setSearching(false); }
  }, [kw]);

  async function call(body: any) {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/event-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || '失敗'); return; }
      onReviewed();
    } catch { setErr('網絡錯誤'); } finally { setBusy(false); }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-text-primary">{sub.content.slice(0, 80)}</span>
          </div>
          <div className="mt-1 text-sm text-text-secondary space-y-0.5">
            <p>📅 {String(sub.event_date).slice(0, 10)}</p>
            <p>👤 {sub.actress_name}</p>
            <p>📍 {sub.location}</p>
            {sub.content.length > 80 && <p className="text-text-tertiary">{sub.content}</p>}
            {sub.source_url && (
              <a href={sub.source_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-[rgb(var(--color-nadeshiko-dark))] break-all">
                <ExternalLink className="w-3.5 h-3.5" /> {sub.source_url}
              </a>
            )}
            {sub.contact && <p className="text-text-tertiary">聯絡：{sub.contact}</p>}
          </div>
        </div>
      </div>

      {/* 配對女優 */}
      <div className="mt-3 border-t border-border pt-3">
        <label className="text-xs font-semibold text-text-secondary">配對女優（粉絲提交時已配對，可改）</label>
        <div className="flex gap-2 mt-1">
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="搜尋日文/假名/羅馬字"
            className="flex-1 min-h-[40px] px-3 rounded-lg border border-border text-sm"
          />
          <button onClick={() => search()} className="px-3 text-sm rounded-lg border border-border hover:bg-sakura-gray">搜</button>
        </div>
        {searching ? <p className="text-xs text-text-tertiary mt-1"><Loader2 className="w-3 h-3 inline animate-spin" /> 搜尋中…</p> : (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sugg.map((s) => (
              <button
                key={s.id}
                onClick={() => setActressId(s.id)}
                className={`text-xs px-2.5 py-1.5 rounded-full border min-h-[32px] ${actressId === s.id ? 'bg-[rgb(var(--color-nadeshiko-dark))] text-white border-transparent' : 'border-border hover:bg-sakura-gray'}`}
              >
                {s.name_ja}{s.name_cn ? ` · ${s.name_cn}` : ''}{s.year_2026_events ? ` (${s.year_2026_events})` : ''}
              </button>
            ))}
            {!searching && sugg.length === 0 && <span className="text-xs text-text-tertiary">搵唔到，可改關鍵字；配唔到女優嘅場暫時無法上架</span>}
          </div>
        )}
      </div>

      {/* 操作 */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          disabled={busy || !/^\d+$/.test(actressId)}
          onClick={() => call({ action: 'approve', id: sub.id, actressId })}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40"
        >
          <Check className="w-4 h-4" /> 批准上架
        </button>
        <button
          disabled={busy}
          onClick={() => setShowReject((v) => !v)}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg border border-border text-sm"
        >
          <X className="w-4 h-4" /> 拒絕
        </button>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />}
        {err && <span className="text-sm text-danger">{err}</span>}
      </div>

      {showReject && (
        <div className="mt-2 flex gap-2">
          <input
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="拒絕原因（選填）"
            className="flex-1 min-h-[40px] px-3 rounded-lg border border-border text-sm"
          />
          <button
            onClick={() => call({ action: 'reject', id: sub.id, note })}
            className="min-h-[40px] px-4 rounded-lg bg-red-500 text-white text-sm"
          >確認拒絕</button>
        </div>
      )}
    </div>
  );
}

export default function EventSubmissionsAdmin() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [authErr, setAuthErr] = useState('');

  useEffect(() => {
    const t = sessionStorage.getItem('admin_token') || '';
    if (t) { setToken(t); setAuthed(true); }
  }, []);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/event-submissions?status=${status}`, { headers: { 'x-admin-token': tk } });
      if (r.status === 401) { setAuthed(false); setAuthErr('Token 唔啱'); setRows([]); return; }
      const d = await r.json();
      setRows(d.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) load(tab, token); }, [authed, tab, token, load]);

  function login() {
    if (token.trim()) {
      sessionStorage.setItem('admin_token', token.trim());
      setAuthed(true); setAuthErr('');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white border border-border rounded-2xl p-6">
          <h1 className="font-bold text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> 活動補充審批</h1>
          <p className="text-xs text-text-tertiary mt-1">輸入 ADMIN_TOKEN</p>
          <input
            type="password" value={token} onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="mt-3 w-full min-h-[44px] px-3 rounded-xl border border-border text-sm"
            placeholder="admin token"
          />
          {authErr && <p className="text-sm text-danger mt-2">{authErr}</p>}
          <button onClick={login} className="mt-3 w-full min-h-[44px] rounded-xl bg-[rgb(var(--color-nadeshiko-dark))] text-white font-semibold text-sm">進入</button>
        </div>
      </div>
    );
  }

  const tabs = [['pending', '待批'], ['approved', '已批准'], ['rejected', '已拒絕']] as const;

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[rgb(var(--color-nadeshiko-dark))]" />
          <h1 className="font-bold">活動補充審批</h1>
          <div className="ml-auto flex gap-1">
            {tabs.map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-3 py-1.5 rounded-lg text-sm ${tab === v ? 'bg-[rgb(var(--color-nadeshiko-dark))] text-white' : 'hover:bg-sakura-gray'}`}>{l}</button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <p className="text-center text-text-tertiary py-10"><Loader2 className="w-5 h-5 inline animate-spin" /> 載入中…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-text-tertiary py-10">冇{tab === 'pending' ? '待批' : '記錄'}</p>
        ) : rows.map((s) => (
          <Row key={s.id} sub={s} token={token} onReviewed={() => load(tab, token)} />
        ))}
      </main>
    </div>
  );
}
