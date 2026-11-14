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
  TabList,
  Tab,
  SegmentedControl,
  SegmentedControlItem,
  EmptyState,
  useToast,
  Link as AstryxLink,
} from '@astryxdesign/core';
import { AstryxShell } from '../_astryx/AstryxShell';

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

type EventType = 'meet' | 'photo' | 'other';
const TABS = [
  { key: 'pending', label: '待批' },
  { key: 'approved', label: '已批准' },
  { key: 'rejected', label: '已拒絕' },
] as const;

const STATUS_TONE: Record<string, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'neutral',
};

function SubmissionCard({ sub, token, onReviewed, toast }: {
  sub: Submission;
  token: string;
  onReviewed: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [actressId, setActressId] = useState(String(sub.actress_id || ''));
  const [kw, setKw] = useState(sub.actress_name);
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState('');
  const [eventType, setEventType] = useState<EventType>('other');
  const [venue, setVenue] = useState('');

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

  // 首次用女優名自動搜
  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);

  async function call(body: Record<string, unknown>) {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/event-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || '失敗'); return; }
      toast({ body: body.action === 'approve' ? `已批准上架 #${sub.id}` : `已拒絕 #${sub.id}`, type: body.action === 'approve' ? 'info' : 'error' });
      onReviewed();
    } catch {
      setErr('網絡錯誤');
    } finally { setBusy(false); }
  }

  const isPending = sub.status === 'pending';

  return (
    <Card padding={4}>
      <Stack direction="vertical" gap={2}>
        <Stack direction="horizontal" justify="between" align="start" gap={2} wrap="wrap">
          <strong style={{ fontSize: 14 }}>{sub.content.slice(0, 80)}</strong>
          <Badge label={sub.status} variant={STATUS_TONE[sub.status] ?? 'neutral'} />
        </Stack>

        <Stack direction="vertical" gap={1} style={{ fontSize: 13, color: '#4a3640' }}>
          <p style={{ margin: 0 }}>📅 {String(sub.event_date).slice(0, 10)}</p>
          <p style={{ margin: 0 }}>👤 {sub.actress_name}</p>
          <p style={{ margin: 0 }}>📍 {sub.location}</p>
          {sub.content.length > 80 && <p style={{ margin: 0, color: '#8a6a78' }}>{sub.content}</p>}
          {sub.source_url && (
            <AstryxLink href={sub.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              來源 ↗ {sub.source_url}
            </AstryxLink>
          )}
          {sub.contact && <p style={{ margin: 0, fontSize: 12, color: '#a08893' }}>聯絡：{sub.contact}</p>}
          {sub.admin_note && <p style={{ margin: 0, fontSize: 12, color: '#8a6a78' }}>備註：{sub.admin_note}</p>}
          {sub.created_event_id && (
            <p style={{ margin: 0, fontSize: 12, color: '#1a7f37' }}>已建立事件：{sub.created_event_id}</p>
          )}
        </Stack>

        {isPending && (
          <>
            <Divider />
            {/* 配對女優 */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#6d4a58' }}>配對女優（粉絲提交時已配對，可改）</p>
              <Stack direction="horizontal" gap={2}>
                <div style={{ flex: 1 }}>
                  <TextInput label="女優搜尋" isLabelHidden placeholder="搜尋日文/假名/羅馬字"
                    value={kw} onChange={(v) => setKw(v)} onEnter={() => search()} />
                </div>
                <Button label="搜" variant="secondary" onClick={() => search()} />
              </Stack>
              {searching ? (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#a08893' }}>搜尋中…</p>
              ) : sugg.length > 0 ? (
                <Stack direction="horizontal" gap={1} wrap="wrap" style={{ marginTop: 8 }}>
                  {sugg.map((s) => (
                    <Button key={s.id} size="sm"
                      variant={actressId === s.id ? 'primary' : 'secondary'}
                      label={`${s.name_ja}${s.name_cn ? ` · ${s.name_cn}` : ''}${s.year_2026_events ? ` (${s.year_2026_events})` : ''}`}
                      onClick={() => setActressId(s.id)} />
                  ))}
                </Stack>
              ) : (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#a08893' }}>搵唔到，可改關鍵字；配唔到女優嘅場暫時無法上架</p>
              )}
            </div>

            <Divider />
            {/* 活動類型 + 場地 */}
            <Stack direction="horizontal" gap={3} wrap="wrap">
              <div style={{ minWidth: 220 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#6d4a58' }}>活動類型</p>
                <SegmentedControl value={eventType} onChange={(v) => setEventType(v as EventType)} label="活動類型">
                  <SegmentedControlItem value="meet" label="見面會" />
                  <SegmentedControlItem value="photo" label="攝影會" />
                  <SegmentedControlItem value="other" label="其他" />
                </SegmentedControl>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <TextInput label="具體場地（選填）" placeholder="例：旺角某某 Studio"
                  value={venue} onChange={setVenue} />
              </div>
            </Stack>

            {/* 操作 */}
            <Stack direction="horizontal" gap={2} wrap="wrap" align="center">
              <Button label="批准上架" variant="primary" isLoading={busy}
                isDisabled={busy || !/^\d+$/.test(actressId)}
                onClick={() => call({ action: 'approve', id: sub.id, actressId, eventType, venue })} />
              <Button label="拒絕" variant="destructive" isDisabled={busy}
                onClick={() => setShowReject((v) => !v)} />
              {busy && <Spinner size="sm" />}
              {err && <span style={{ fontSize: 12, color: '#e1193b' }}>{err}</span>}
            </Stack>

            {showReject && (
              <Stack direction="horizontal" gap={2} align="end">
                <div style={{ flex: 1 }}>
                  <TextInput label="拒絕原因（選填）" isLabelHidden placeholder="拒絕原因（選填）"
                    value={note} onChange={setNote} />
                </div>
                <Button label="確認拒絕" variant="destructive" isLoading={busy}
                  onClick={() => call({ action: 'reject', id: sub.id, note })} />
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

function EventSubmissionsAstryxApp({ embeddedToken, embedded = false }: { embeddedToken?: string; embedded?: boolean }) {
  const toast = useToast();
  const [token, setToken] = useState(embeddedToken ?? '');
  const [authed, setAuthed] = useState(!!embeddedToken);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState<string>('pending');
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (embeddedToken) { setToken(embeddedToken); setAuthed(true); return; }
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) { setToken(saved); setAuthed(true); }
  }, [embeddedToken]);

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
    if (token.trim()) { sessionStorage.setItem('admin_token', token.trim()); setAuthed(true); setAuthErr(''); }
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '64px 16px' }}>
        <Card padding={6}>
          <Stack direction="vertical" gap={3}>
            <h1 style={{ margin: 0, fontSize: 18 }}>活動補充審批 · Astryx</h1>
            <TextInput label="admin token" isLabelHidden type="password" placeholder="admin token"
              value={token} onChange={(v) => setToken(v)} onEnter={login} />
            {authErr && <p style={{ margin: 0, color: '#e1193b', fontSize: 12 }}>{authErr}</p>}
            <Button label="進入" variant="primary" onClick={login} />
          </Stack>
        </Card>
      </main>
    );
  }

  return (
    <main style={embedded ? undefined : { maxWidth: 880, margin: '0 auto', padding: '28px 16px 96px' }}>
      <Stack direction="horizontal" justify="between" align="center" gap={2} wrap="wrap">
        <h1 style={{ margin: 0, fontSize: embedded ? 17 : 20 }}>活動補充審批</h1>
        <Button label="重新整理" variant="secondary" size="sm" isLoading={loading} onClick={() => load(tab, token)} />
      </Stack>

      <div style={{ margin: '16px 0' }}>
        <TabList value={tab} onChange={setTab}>
          {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
        </TabList>
      </div>

      {loading ? (
        <Stack direction="vertical" align="center" gap={2} style={{ padding: 40 }}><Spinner size="lg" label="載入中" /></Stack>
      ) : rows.length === 0 ? (
        <EmptyState title={tab === 'pending' ? '冇待批項目' : '冇記錄'} />
      ) : (
        <Stack direction="vertical" gap={3}>
          {rows.map((s) => (
            <SubmissionCard key={s.id} sub={s} token={token} onReviewed={() => load(tab, token)} toast={toast} />
          ))}
        </Stack>
      )}
    </main>
  );
}

export function EventSubmissionsAstryxStandalone() {
  return <AstryxShell><EventSubmissionsAstryxApp /></AstryxShell>;
}

export default function EventSubmissionsAstryxPanel({ embeddedToken }: { embeddedToken?: string }) {
  return <AstryxShell><EventSubmissionsAstryxApp embeddedToken={embeddedToken} embedded /></AstryxShell>;
}
