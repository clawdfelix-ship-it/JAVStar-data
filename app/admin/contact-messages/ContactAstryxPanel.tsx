'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Stack,
  Divider,
  TabList,
  Tab,
  TextInput,
  Spinner,
  useToast,
} from '@astryxdesign/core';
import { AstryxShell } from '../_astryx/AstryxShell';

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

const TABS = [
  { key: 'new', label: '新查詢' },
  { key: 'read', label: '已處理' },
  { key: 'archived', label: '已封存' },
  { key: 'all', label: '全部' },
] as const;

const TOPIC_TONE: Record<string, 'info' | 'warning' | 'success' | 'neutral' | 'error' | 'blue'> = {
  合作: 'info',
  廣告: 'blue',
  報料: 'success',
  其他: 'neutral',
};

function MessageCard({
  m,
  token,
  onChanged,
  busyId,
  setBusyId,
  toast,
}: {
  m: Message;
  token: string;
  onChanged: () => void;
  busyId: number | null;
  setBusyId: (v: number | null) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const busy = busyId === m.id;

  async function act(action: string) {
    setBusyId(m.id);
    try {
      const r = await fetch('/api/admin/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: m.id, action }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({
        body: action === 'read' ? `已標為處理 #${m.id}` : action === 'archived' ? `已封存 #${m.id}` : `已還原 #${m.id}`,
        type: 'info',
      });
      onChanged();
    } catch (err) {
      toast({ body: `操作失敗：${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card padding={4}>
      <Stack direction="vertical" gap={2}>
        <Stack direction="horizontal" justify="between" align="start" wrap="wrap" gap={2}>
          <div style={{ minWidth: 0 }}>
            <Stack direction="horizontal" gap={1} align="center" wrap="wrap">
              <strong style={{ fontSize: 14 }}>{m.name || '（無稱呼）'}</strong>
              <Badge label={m.topic} variant={TOPIC_TONE[m.topic] ?? 'neutral'} />
              <Badge label={m.status} variant={m.status === 'new' ? 'warning' : 'neutral'} />
            </Stack>
            <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#c2185b', wordBreak: 'break-all' }}>
              {m.contact}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#a08893' }}>
              {new Date(m.created_at).toLocaleString('zh-HK')} · #{m.id}
            </p>
          </div>
          <Stack direction="horizontal" gap={1} align="center" wrap="wrap">
            {m.status === 'new' && (
              <Button label="已處理" variant="primary" size="sm" isLoading={busy} isDisabled={busyId !== null} onClick={() => act('read')} />
            )}
            {m.status !== 'archived' ? (
              <Button label="封存" variant="secondary" size="sm" isDisabled={busyId !== null} onClick={() => act('archived')} />
            ) : (
              <Button label="還原" variant="secondary" size="sm" isDisabled={busyId !== null} onClick={() => act('reopen')} />
            )}
          </Stack>
        </Stack>
        <Divider />
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#4a3640' }}>
          {m.message}
        </p>
      </Stack>
    </Card>
  );
}

function ContactAstryxApp({ embeddedToken, embedded = false }: { embeddedToken?: string; embedded?: boolean }) {
  const toast = useToast();
  const [token, setToken] = useState(embeddedToken ?? '');
  const [authed, setAuthed] = useState(!!embeddedToken);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState<string>('new');
  const [rows, setRows] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (embeddedToken) { setToken(embeddedToken); setAuthed(true); return; }
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) { setToken(saved); setAuthed(true); }
  }, [embeddedToken]);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/contact-messages?status=${status}`, { headers: { 'x-admin-token': tk } });
      if (r.status === 401) {
        setAuthed(false); setAuthErr('Token 唔啱'); setRows([]);
      } else {
        const d = await r.json();
        setRows(d.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) load(tab, token); }, [authed, tab, token, load]);

  function login() {
    if (token.trim()) {
      sessionStorage.setItem('admin_token', token.trim());
      setAuthed(true);
    }
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '64px 16px' }}>
        <Card padding={6}>
          <Stack direction="vertical" gap={3}>
            <h1 style={{ margin: 0, fontSize: 18 }}>合作查詢管理 · Astryx</h1>
            <TextInput label="admin token" isLabelHidden type="password" placeholder="admin token"
              value={token} onChange={(v) => setToken(v)} onEnter={login} />
            {authErr && <p style={{ margin: 0, color: '#e1193b', fontSize: 12 }}>{authErr}</p>}
            <Button label="登入" variant="primary" onClick={login} />
          </Stack>
        </Card>
      </main>
    );
  }

  return (
    <main style={embedded ? undefined : { maxWidth: 720, margin: '0 auto', padding: '28px 16px 96px' }}>
      <Stack direction="horizontal" justify="between" align="center" wrap="wrap" gap={2}>
        <div>
          <h1 style={{ margin: 0, fontSize: embedded ? 17 : 20 }}>合作查詢</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8a6a78' }}>新查詢處理後標記「已處理」，封存可隨時還原。</p>
        </div>
        <Button label="重新整理" variant="secondary" size="sm" isLoading={loading} onClick={() => load(tab, token)} />
      </Stack>

      <div style={{ margin: '16px 0' }}>
        <TabList value={tab} onChange={setTab}>
          {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
        </TabList>
      </div>

      {loading ? (
        <Stack direction="vertical" align="center" gap={2} style={{ padding: 40 }}>
          <Spinner size="lg" label="載入中" />
        </Stack>
      ) : !rows || rows.length === 0 ? (
        <Card padding={6}><p style={{ textAlign: 'center', margin: 0, color: '#8a6a78' }}>暫無查詢</p></Card>
      ) : (
        <Stack direction="vertical" gap={3}>
          {rows.map((m) => (
            <MessageCard key={m.id} m={m} token={token} onChanged={() => load(tab, token)}
              busyId={busyId} setBusyId={setBusyId} toast={toast} />
          ))}
        </Stack>
      )}
    </main>
  );
}

export function ContactAstryxStandalone() {
  return (
    <AstryxShell>
      <ContactAstryxApp />
    </AstryxShell>
  );
}

export default function ContactAstryxPanel({ embeddedToken }: { embeddedToken?: string }) {
  return (
    <AstryxShell>
      <ContactAstryxApp embeddedToken={embeddedToken} embedded />
    </AstryxShell>
  );
}
