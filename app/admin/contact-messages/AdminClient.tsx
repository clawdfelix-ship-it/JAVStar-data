'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, Archive, Loader2, ShieldCheck, RotateCcw } from 'lucide-react';

interface Message {
  id: number;
  name: string | null;
  contact: string;
  topic: string;
  message: string;
  ip: string | null;
  status: string;
  created_at: string;
}

function Row({ m, token, onChanged }: { m: Message; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function act(action: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: m.id, action }),
      });
      if (r.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[rgba(var(--color-sakura-gray),0.7)] p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary">
            {m.name || '（無稱呼）'}
            <span className="ml-2 text-[10px] font-semibold text-white bg-[rgb(var(--color-nadeshiko-strong))] px-1.5 py-0.5 rounded-full align-middle">
              {m.topic}
            </span>
          </p>
          <p className="text-xs text-[rgb(var(--color-nadeshiko-dark))] font-semibold mt-0.5 break-all">{m.contact}</p>
          <p className="text-[11px] text-text-tertiary mt-0.5">{new Date(m.created_at).toLocaleString('zh-HK')}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {m.status === 'new' && (
            <button
              onClick={() => act('read')}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:opacity-90 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> 已處理
            </button>
          )}
          {m.status !== 'archived' ? (
            <button
              onClick={() => act('archived')}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-50 disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" /> 封存
            </button>
          ) : (
            <button
              onClick={() => act('reopen')}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 還原
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed mt-2 border-t border-[rgba(var(--color-sakura-gray),0.5)] pt-2">
        {m.message}
      </p>
    </div>
  );
}

const TABS = [
  { key: 'new', label: '新查詢' },
  { key: 'read', label: '已處理' },
  { key: 'archived', label: '已封存' },
  { key: 'all', label: '全部' },
];

export default function ContactAdminClient() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState('new');
  const [rows, setRows] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    const r = await fetch(`/api/admin/contact-messages?status=${status}`, {
      headers: { 'x-admin-token': tk },
    });
    if (r.status === 401) {
      setAuthed(false);
      setAuthErr('Token 唔啱');
      setRows([]);
    } else {
      const d = await r.json();
      setRows(d.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem('admin_token') || '';
    if (t) {
      setToken(t);
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
        <div className="bg-white rounded-2xl border p-6">
          <h1 className="text-lg font-bold flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-pink-600" /> 合作查詢管理
          </h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="admin token"
            className="w-full min-h-[44px] px-3 border rounded-xl text-sm mb-3"
          />
          {authErr && <p className="text-sm text-red-600 mb-2">{authErr}</p>}
          <button onClick={login} className="w-full min-h-[44px] rounded-xl bg-pink-600 text-white text-sm font-bold">
            登入
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24">
      <h1 className="text-xl font-bold mb-4">合作查詢</h1>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
              tab === t.key ? 'bg-pink-600 text-white' : 'bg-white border text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        </div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-center text-text-tertiary text-sm py-10">暫無查詢</p>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <Row key={m.id} m={m} token={token} onChanged={() => load(tab, token)} />
          ))}
        </div>
      )}
    </main>
  );
}
