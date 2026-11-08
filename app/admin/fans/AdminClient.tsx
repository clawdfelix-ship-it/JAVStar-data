'use client';

import { useState, useCallback, useEffect } from 'react';
import { ShieldCheck, Loader2, Download, Bell, Copy, Check, Send, Trash2 } from 'lucide-react';

interface Sub {
  id: string;
  actress_id: string;
  name_ja: string | null;
  name_cn: string | null;
  email: string | null;
  tg_handle: string | null;
  ig_handle: string | null;
  channel_pref: string;
  region_pref: string;
  status: string;
  created_at: string;
}
interface Count { actress_id: string; name: string; active: number; }
interface SiteSub {
  chat_id: string;
  tg_handle: string | null;
  region_pref: string;
  status: string;
  source: string;
  created_at_hk: string;
}
interface NotifyEvent {
  id: string; title: string; date_iso: string; venue: string | null; prefecture: string | null;
  tg_recipients: number; batch_pending: boolean; batch_sent: boolean;
}

export default function FansAdminClient({ embeddedToken }: { embeddedToken?: string }) {
  const [token, setToken] = useState(embeddedToken ?? '');
  const [authed, setAuthed] = useState(!!embeddedToken);
  const [authErr, setAuthErr] = useState('');
  const [actressId, setActressId] = useState('');
  const [counts, setCounts] = useState<Count[]>([]);
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [events, setEvents] = useState<NotifyEvent[]>([]);
  const [busyId, setBusyId] = useState('');
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [view, setView] = useState<'actress' | 'site'>('actress');
  const [siteRows, setSiteRows] = useState<SiteSub[] | null>(null);
  const [siteLoading, setSiteLoading] = useState(false);

  const loadSite = useCallback(async (tk: string) => {
    setSiteLoading(true);
    try {
      const r = await fetch('/api/admin/fan-subscriptions?scope=site&status=all', {
        headers: { 'x-admin-token': tk },
      });
      if (r.ok) setSiteRows((await r.json()).data || []);
    } finally { setSiteLoading(false); }
  }, []);

  async function deleteSite(chatId: string) {
    if (!window.confirm(`確定刪除全站訂閱 chat ${chatId}？`)) return;
    const r = await fetch(`/api/admin/fan-subscriptions?scope=site&chat_id=${chatId}`, {
      method: 'DELETE', headers: { 'x-admin-token': token },
    });
    if (r.ok) loadSite(token);
    else alert('刪除失敗');
  }

  function downloadSiteCsv() {
    fetch('/api/admin/fan-subscriptions?scope=site&status=all&format=csv', { headers: { 'x-admin-token': token } })
      .then((r) => r.blob()).then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url; a.download = 'site-subscriptions.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  }

  const loadCounts = useCallback(async (tk: string) => {
    const r = await fetch('/api/admin/fan-subscriptions', { headers: { 'x-admin-token': tk } });
    if (r.ok) {
      const d = await r.json();
      setCounts(d.active_by_actress || []);
      setRows(d.data || []);
    }
    return r.status;
  }, []);

  const loadEvents = useCallback(async (tk: string) => {
    const r = await fetch('/api/admin/notify-events', { headers: { 'x-admin-token': tk } });
    if (r.ok) setEvents((await r.json()).events || []);
  }, []);

  const loadActress = useCallback(async (id: string, tk: string) => {
    setLoading(true);
    const q = id ? `?actress_id=${id}` : '';
    const r = await fetch(`/api/admin/fan-subscriptions${q}`, { headers: { 'x-admin-token': tk } });
    if (r.status === 401) { setAuthed(false); setAuthErr('Token 唔啱'); setRows([]); }
    else { const d = await r.json(); setRows(d.data || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem('admin_token') || '';
    if (t) { setToken(t); setAuthed(true); }
  }, []);

  useEffect(() => { if (authed) { loadCounts(token); loadEvents(token); } }, [authed, token, loadCounts, loadEvents]);
  useEffect(() => { if (authed && view === 'site') loadSite(token); }, [authed, view, token, loadSite]);

  async function createBatch(ev: NotifyEvent) {
    setBusyId(ev.id);
    try {
      const r = await fetch('/api/admin/notify-create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ event_id: ev.id }),
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error || '建立失敗'); return; }
      setCodes((c) => ({ ...c, [ev.id]: d.pull_code }));
      loadEvents(token);
    } finally { setBusyId(''); }
  }

  function login() {
    if (token.trim()) { sessionStorage.setItem('admin_token', token.trim()); setAuthed(true); }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1200);
  }

  // one-click list of primary contact (tg > ig > email) for blast
  const contactList = (rows || [])
    .filter((r) => r.status === 'active')
    .map((r) => r.tg_handle ? '@' + r.tg_handle.replace(/^@/, '') : r.ig_handle ? 'IG:' + r.ig_handle.replace(/^@/, '') : r.email || '')
    .filter(Boolean);

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="bg-white rounded-2xl border p-6">
          <h1 className="text-lg font-bold flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-pink-600" /> 追蹤名單管理
          </h1>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()} placeholder="admin token"
            className="w-full min-h-[44px] px-3 border rounded-xl text-sm mb-3" />
          {authErr && <p className="text-sm text-red-600 mb-2">{authErr}</p>}
          <button onClick={login} className="w-full min-h-[44px] rounded-xl bg-pink-600 text-white text-sm font-bold">登入</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
        <Bell className="w-5 h-5 text-pink-600" /> 港台場通知名單
      </h1>
      <p className="text-xs text-text-tertiary mb-4">粉絲喺女優頁撳「🔔 港台場通知我」收集；開票時用嚟私訊推播。</p>

      {/* 分頁：指定女優 / 全站訂閱 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('actress')}
          className={`text-xs font-semibold px-3 py-2 rounded-full border ${view === 'actress' ? 'bg-pink-600 text-white border-pink-600' : ''}`}>
          指定女優訂閱
        </button>
        <button onClick={() => setView('site')}
          className={`text-xs font-semibold px-3 py-2 rounded-full border ${view === 'site' ? 'bg-pink-600 text-white border-pink-600' : ''}`}>
          全站 Telegram 訂閱
        </button>
      </div>

      {view === 'site' ? (
        <div className="bg-white rounded-2xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-tertiary">
              全站訂閱（site_subscriptions）· 共 {(siteRows || []).length} 筆
            </p>
            <button onClick={downloadSiteCsv}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-green-600 text-white">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          {siteLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>
          ) : !siteRows || siteRows.length === 0 ? (
            <p className="text-center text-text-tertiary text-sm py-10">暫無全站訂閱</p>
          ) : (
            <div className="space-y-2">
              {siteRows.map((r) => (
                <div key={r.chat_id} className="rounded-xl border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary break-all">
                      {r.tg_handle ? '@' + r.tg_handle.replace(/^@/, '') : 'chat ' + r.chat_id}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      chat {r.chat_id} · {r.region_pref} · {r.created_at_hk}
                      {r.status !== 'active' && <span className="ml-1 text-red-500">（已退訂）</span>}
                    </p>
                  </div>
                  <button onClick={() => deleteSite(r.chat_id)}
                    className="shrink-0 text-text-tertiary hover:text-red-600" title="刪除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* per-actress active counts */}
      <div className="bg-white rounded-2xl border p-4 mb-4">
        <p className="text-xs font-semibold text-text-tertiary mb-2">各女優活躍追蹤人數</p>
        {counts.length === 0 ? (
          <p className="text-sm text-text-tertiary">暫時未有追蹤</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setActressId(''); loadActress('', token); }}
              className={`text-xs px-3 py-1.5 rounded-full border ${!actressId ? 'bg-pink-600 text-white border-pink-600' : ''}`}>
              全部 ({counts.reduce((s, c) => s + c.active, 0)})
            </button>
            {counts.map((c) => (
              <button key={c.actress_id} onClick={() => { setActressId(c.actress_id); loadActress(c.actress_id, token); }}
                className={`text-xs px-3 py-1.5 rounded-full border ${actressId === c.actress_id ? 'bg-pink-600 text-white border-pink-600' : ''}`}>
                {c.name} · {c.active}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Telegram 開票通知批次 */}
      {events.length > 0 && (
        <div className="bg-white rounded-2xl border p-4 mb-4">
          <p className="text-xs font-semibold text-text-tertiary mb-1">Telegram 開票通知（自家場）</p>
          <p className="text-[10px] text-text-tertiary mb-3">撳「產生發送碼」後，喺 VVIP bot 打 <code>/fanpull &lt;碼&gt;</code> 就會逐個發送。碼單次有效。</p>
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-snug">{ev.title}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">
                      {String(ev.date_iso).slice(0, 10)} · {ev.venue || ev.prefecture || ''} · 可發 {ev.tg_recipients} 人
                      {ev.batch_sent && <span className="ml-1 text-green-600 font-semibold">（已發送）</span>}
                    </p>
                  </div>
                  <button onClick={() => createBatch(ev)} disabled={busyId === ev.id || ev.tg_recipients === 0}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#229ED9] text-white disabled:opacity-40">
                    {busyId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    產生發送碼
                  </button>
                </div>
                {codes[ev.id] && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-pink-50 px-2.5 py-2">
                    <code className="text-xs font-bold text-pink-700 break-all">/fanpull {codes[ev.id]}</code>
                    <button onClick={() => copy(`/fanpull ${codes[ev.id]}`, 'pull-' + ev.id)}
                      className="ml-auto shrink-0 text-pink-600">
                      {copied === 'pull-' + ev.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* actions */}
      <div className="flex gap-2 mb-4 flex-wrap">
          <a href={`/api/admin/fan-subscriptions${actressId ? '?actress_id=' + actressId : ''}&format=csv`}
             onClick={(e) => {
               // CSV endpoint needs admin header; do it via fetch+blob instead of plain link
               e.preventDefault();
               fetch(`/api/admin/fan-subscriptions${actressId ? '?actress_id=' + actressId : ''}&format=csv`,
                 { headers: { 'x-admin-token': token } })
                 .then((r) => r.blob()).then((b) => {
                   const url = URL.createObjectURL(b);
                   const a = document.createElement('a');
                   a.href = url; a.download = `fan-subscriptions${actressId ? '-' + actressId : ''}.csv`;
                   a.click(); URL.revokeObjectURL(url);
                 });
             }}
             className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-green-600 text-white">
            <Download className="w-3.5 h-3.5" /> 下載 CSV
          </a>
          {contactList.length > 0 && (
            <button onClick={() => copy(contactList.join('\n'), 'list')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border">
              {copied === 'list' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              複製聯絡清單 ({contactList.length})
            </button>
          )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-center text-text-tertiary text-sm py-10">暫無追蹤記錄</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-text-tertiary">共 {rows.length} 筆（含已退訂）</p>
          {rows.map((r) => {
            const primary = r.tg_handle ? '@' + r.tg_handle.replace(/^@/, '') : r.ig_handle ? 'IG:' + r.ig_handle.replace(/^@/, '') : r.email;
            return (
              <div key={r.id} className="bg-white rounded-xl border p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">{r.name_ja || r.name_cn || r.actress_id}</p>
                  <p className="text-xs text-pink-700 font-semibold break-all mt-0.5">{primary}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {[r.channel_pref, r.region_pref].filter(Boolean).join(' · ')} · {new Date(r.created_at).toLocaleString('zh-HK')}
                    {r.status !== 'active' && <span className="ml-1 text-red-500">（已退訂）</span>}
                  </p>
                </div>
                {primary && (
                  <button onClick={() => copy(primary, r.id)} className="shrink-0 text-text-tertiary hover:text-pink-600">
                    {copied === r.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </main>
  );
}
