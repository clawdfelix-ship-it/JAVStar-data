'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Stack,
  Divider,
  Spinner,
  TextInput,
  useToast,
  SegmentedControl,
  SegmentedControlItem,
  EmptyState,
  IconButton,
  Dialog,
  DialogHeader,
  Code,
} from '@astryxdesign/core';
import { AstryxShell } from '../_astryx/AstryxShell';

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

type View = 'actress' | 'site';

function FansAstryxApp({ embeddedToken, embedded = false }: { embeddedToken?: string; embedded?: boolean }) {
  const toast = useToast();
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
  const [view, setView] = useState<View>('actress');
  const [siteRows, setSiteRows] = useState<SiteSub[] | null>(null);
  const [siteLoading, setSiteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SiteSub | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (embeddedToken) { setToken(embeddedToken); setAuthed(true); return; }
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) { setToken(saved); setAuthed(true); }
  }, [embeddedToken]);

  const loadSite = useCallback(async (tk: string) => {
    setSiteLoading(true);
    try {
      const r = await fetch('/api/admin/fan-subscriptions?scope=site&status=all', { headers: { 'x-admin-token': tk } });
      if (r.ok) setSiteRows((await r.json()).data || []);
    } finally { setSiteLoading(false); }
  }, []);

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

  useEffect(() => { if (authed) { loadCounts(token); loadEvents(token); } }, [authed, token, loadCounts, loadEvents]);
  useEffect(() => { if (authed && view === 'site') loadSite(token); }, [authed, view, token, loadSite]);

  function login() {
    if (token.trim()) { sessionStorage.setItem('admin_token', token.trim()); setAuthed(true); }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1200);
  }

  async function downloadCsv(url: string, filename: string) {
    try {
      const r = await fetch(url, { headers: { 'x-admin-token': token } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const b = await r.blob();
      const o = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = o; a.download = filename; a.click();
      URL.revokeObjectURL(o);
      toast({ body: `已下載 ${filename}`, type: 'info' });
    } catch (err) {
      toast({ body: `下載失敗：${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    }
  }

  async function createBatch(ev: NotifyEvent) {
    setBusyId(ev.id);
    try {
      const r = await fetch('/api/admin/notify-create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ event_id: ev.id }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ body: d.error || '建立失敗', type: 'error' }); return; }
      setCodes((c) => ({ ...c, [ev.id]: d.pull_code }));
      toast({ body: `已產生發送碼（${d.recipients} 人）`, type: 'info' });
      loadEvents(token);
    } finally { setBusyId(''); }
  }

  async function confirmDeleteSite() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/fan-subscriptions?scope=site&chat_id=${confirmDelete.chat_id}`, {
        method: 'DELETE', headers: { 'x-admin-token': token },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ body: `已刪除 chat ${confirmDelete.chat_id}`, type: 'error' });
      setConfirmDelete(null);
      loadSite(token);
    } catch (err) {
      toast({ body: `刪除失敗：${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally { setDeleting(false); }
  }

  const contactList = (rows || [])
    .filter((r) => r.status === 'active')
    .map((r) => r.tg_handle ? '@' + r.tg_handle.replace(/^@/, '') : r.ig_handle ? 'IG:' + r.ig_handle.replace(/^@/, '') : r.email || '')
    .filter(Boolean);

  if (!authed) {
    return (
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '64px 16px' }}>
        <Card padding={6}>
          <Stack direction="vertical" gap={3}>
            <h1 style={{ margin: 0, fontSize: 18 }}>追蹤名單管理 · Astryx</h1>
            <TextInput label="admin token" isLabelHidden type="password" placeholder="admin token"
              value={token} onChange={(v) => setToken(v)} onEnter={login} />
            {authErr && <p style={{ margin: 0, color: '#e1193b', fontSize: 12 }}>{authErr}</p>}
            <Button label="登入" variant="primary" onClick={login} />
          </Stack>
        </Card>
      </main>
    );
  }

  const totalActive = counts.reduce((s, c) => s + c.active, 0);

  return (
    <main style={embedded ? undefined : { maxWidth: 880, margin: '0 auto', padding: '28px 16px 96px' }}>
      <h1 style={{ margin: 0, fontSize: embedded ? 17 : 20 }}>港台場通知名單</h1>
      <p style={{ margin: '4px 0 16px', fontSize: 12, color: '#8a6a78' }}>
        粉絲喺女優頁撳「🔔 港台場通知我」收集；開票時用嚟私訊推播。
      </p>

      <SegmentedControl value={view} onChange={(v) => setView(v as View)} label="視圖" style={{ marginBottom: 16 }}>
        <SegmentedControlItem value="actress" label="指定女優訂閱" />
        <SegmentedControlItem value="site" label="全站 Telegram 訂閱" />
      </SegmentedControl>

      {view === 'site' ? (
        <Card padding={4}>
          <Stack direction="horizontal" justify="between" align="center" wrap="wrap" gap={2}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8a6a78' }}>
              全站訂閱（site_subscriptions）· 共 {(siteRows || []).length} 筆
            </p>
            <Button label="下載 CSV" variant="primary" size="sm"
              onClick={() => downloadCsv('/api/admin/fan-subscriptions?scope=site&status=all&format=csv', 'site-subscriptions.csv')} />
          </Stack>
          <Divider style={{ margin: '12px 0' }} />
          {siteLoading ? (
            <Stack direction="vertical" align="center" gap={2} style={{ padding: 40 }}><Spinner size="lg" label="載入中" /></Stack>
          ) : !siteRows || siteRows.length === 0 ? (
            <EmptyState title="暫無全站訂閱" description="未有人透過 Telegram 訂閱全站通知。" />
          ) : (
            <Stack direction="vertical" gap={2}>
              {siteRows.map((r) => (
                <Stack key={r.chat_id} direction="horizontal" justify="between" align="start" gap={2}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, wordBreak: 'break-all' }}>
                      {r.tg_handle ? '@' + r.tg_handle.replace(/^@/, '') : 'chat ' + r.chat_id}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#a08893' }}>
                      chat {r.chat_id} · {r.region_pref} · {r.created_at_hk}
                      {r.status !== 'active' && <span style={{ color: '#e1193b' }}>（已退訂）</span>}
                    </p>
                  </div>
                  <IconButton label="刪除" variant="destructive" size="sm"
                    icon={<span aria-hidden>🗑</span>} onClick={() => setConfirmDelete(r)} />
                </Stack>
              ))}
            </Stack>
          )}
        </Card>
      ) : (
        <Stack direction="vertical" gap={4}>
          {/* per-actress counts */}
          <Card padding={4}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#8a6a78' }}>各女優活躍追蹤人數</p>
            {counts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#a08893' }}>暫時未有追蹤</p>
            ) : (
              <Stack direction="horizontal" gap={1} wrap="wrap">
                <Button label={`全部 (${totalActive})`} size="sm"
                  variant={!actressId ? 'primary' : 'secondary'}
                  onClick={() => { setActressId(''); loadActress('', token); }} />
                {counts.map((c) => (
                  <Button key={c.actress_id} size="sm"
                    variant={actressId === c.actress_id ? 'primary' : 'secondary'}
                    label={`${c.name} · ${c.active}`}
                    onClick={() => { setActressId(c.actress_id); loadActress(c.actress_id, token); }} />
                ))}
              </Stack>
            )}
          </Card>

          {/* notify batch */}
          {events.length > 0 && (
            <Card padding={4}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8a6a78' }}>Telegram 開票通知（自家場）</p>
              <p style={{ margin: '4px 0 12px', fontSize: 11, color: '#a08893' }}>
                撳「產生發送碼」後，喺 VVIP bot 打 <Code>/fanpull &lt;碼&gt;</Code> 就會逐個發送，碼單次有效。
              </p>
              <Stack direction="vertical" gap={2}>
                {events.map((ev) => (
                  <Card key={ev.id} padding={3}>
                    <Stack direction="horizontal" justify="between" align="start" gap={2} wrap="wrap">
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{ev.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#a08893' }}>
                          {String(ev.date_iso).slice(0, 10)} · {ev.venue || ev.prefecture || ''} · 可發 {ev.tg_recipients} 人
                          {ev.batch_sent && <span style={{ color: '#1a7f37', fontWeight: 600 }}>（已發送）</span>}
                        </p>
                      </div>
                      <Button label="產生發送碼" size="sm" isLoading={busyId === ev.id}
                        isDisabled={ev.tg_recipients === 0} onClick={() => createBatch(ev)} />
                    </Stack>
                    {codes[ev.id] && (
                      <Stack direction="horizontal" align="center" gap={2}
                        style={{ marginTop: 10, background: '#fdf2f7', borderRadius: 10, padding: '8px 10px' }}>
                        <Code>{`/fanpull ${codes[ev.id]}`}</Code>
                        <Button label={copied === 'pull-' + ev.id ? '已複製' : '複製'} size="sm" variant="ghost"
                          onClick={() => copy(`/fanpull ${codes[ev.id]}`, 'pull-' + ev.id)} />
                      </Stack>
                    )}
                  </Card>
                ))}
              </Stack>
            </Card>
          )}

          {/* actions */}
          <Stack direction="horizontal" gap={2} wrap="wrap">
            <Button label="下載 CSV" variant="primary" size="sm"
              onClick={() => downloadCsv(`/api/admin/fan-subscriptions${actressId ? '?actress_id=' + actressId : ''}&format=csv`,
                `fan-subscriptions${actressId ? '-' + actressId : ''}.csv`)} />
            {contactList.length > 0 && (
              <Button label={`複製聯絡清單 (${contactList.length})`} variant="secondary" size="sm"
                onClick={() => copy(contactList.join('\n'), 'list')} />
            )}
          </Stack>

          {loading ? (
            <Stack direction="vertical" align="center" gap={2} style={{ padding: 40 }}><Spinner size="lg" label="載入中" /></Stack>
          ) : !rows || rows.length === 0 ? (
            <EmptyState title="暫無追蹤記錄" />
          ) : (
            <Stack direction="vertical" gap={2}>
              <p style={{ margin: 0, fontSize: 11, color: '#a08893' }}>共 {rows.length} 筆（含已退訂）</p>
              {rows.map((r) => {
                const primary = r.tg_handle ? '@' + r.tg_handle.replace(/^@/, '') : r.ig_handle ? 'IG:' + r.ig_handle.replace(/^@/, '') : r.email;
                return (
                  <Card key={r.id} padding={3}>
                    <Stack direction="horizontal" justify="between" align="start" gap={2}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{r.name_ja || r.name_cn || r.actress_id}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#c2185b', wordBreak: 'break-all' }}>{primary}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#a08893' }}>
                          {[r.channel_pref, r.region_pref].filter(Boolean).join(' · ')} · {new Date(r.created_at).toLocaleString('zh-HK')}
                          {r.status !== 'active' && <span style={{ color: '#e1193b' }}>（已退訂）</span>}
                        </p>
                      </div>
                      {primary && (
                        <IconButton label="複製聯絡" variant="ghost" size="sm"
                          icon={<span aria-hidden>{copied === r.id ? '✓' : '⧉'}</span>}
                          onClick={() => copy(primary, r.id)} />
                      )}
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      )}

      <Dialog isOpen={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        purpose="form" width={420} aria-label="確認刪除">
        <Stack direction="vertical" gap={3} style={{ padding: 24 }}>
          <DialogHeader title="刪除全站訂閱？" />
          <p style={{ margin: 0, fontSize: 14 }}>
            {confirmDelete?.tg_handle ? '@' + confirmDelete.tg_handle.replace(/^@/, '') : 'chat ' + confirmDelete?.chat_id}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#8a6a78' }}>
            永久刪除 chat {confirmDelete?.chat_id} 嘅全站訂閱記錄，無法還原。
          </p>
          <Divider />
          <Stack direction="horizontal" gap={2} justify="end">
            <Button label="取消" variant="secondary" onClick={() => setConfirmDelete(null)} />
            <Button label="確認刪除" variant="destructive" isLoading={deleting} onClick={confirmDeleteSite} />
          </Stack>
        </Stack>
      </Dialog>
    </main>
  );
}

export function FansAstryxStandalone() {
  return <AstryxShell><FansAstryxApp /></AstryxShell>;
}

export default function FansAstryxPanel({ embeddedToken }: { embeddedToken?: string }) {
  return <AstryxShell><FansAstryxApp embeddedToken={embeddedToken} embedded /></AstryxShell>;
}
