'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Theme,
  defineTheme,
  Card,
  Button,
  Badge,
  Stack,
  Divider,
  Dialog,
  DialogHeader,
  TabList,
  Tab,
  TextInput,
  Spinner,
  useToast,
  Link as AstryxLink,
} from '@astryxdesign/core';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './astryx-tailwind-shim.css';

// JCHING nadeshiko/sakura mapped onto Astryx tokens (flat light values — see POC notes).
const adminTheme = defineTheme({
  name: 'jching-admin-news',
  tokens: {
    '--color-accent': '#ec6aa0',
    '--color-accent-muted': '#f8c9dc',
    '--color-background-surface': '#fff7fb',
    '--color-background-body': '#fdf2f7',
    '--color-background-card': '#ffffff',
    '--color-text-primary': '#35202b',
    '--color-text-secondary': '#6d4a58',
    '--radius-container': '14px',
  },
});

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
] as const;

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

const CATEGORY_TONE = {
  news: 'info',
  industry: 'neutral',
  interview: 'success',
  gravure: 'info',
  release: 'warning',
  event_report: 'info',
  debut_retire: 'warning',
  entertainment: 'neutral',
} as const;

function NewsCard({
  row,
  token,
  onChanged,
  onAsk,
  busyId,
}: {
  row: NewsRow;
  token: string;
  onChanged: () => void;
  onAsk: (row: NewsRow, action: 'approve' | 'reject') => void;
  busyId: number | null;
}) {
  const [showJa, setShowJa] = useState(false);
  const busy = busyId === row.id;

  return (
    <Card padding={4}>
      <Stack direction="vertical" gap={2}>
        <Stack direction="horizontal" gap={1} align="center" wrap="wrap">
          <Badge label={CATEGORY_LABEL[row.category] || row.category} variant={CATEGORY_TONE[row.category as keyof typeof CATEGORY_TONE] ?? 'neutral'} />
          <Badge label={row.source_name} variant="blue" />
          {row.is_adult && <Badge label="18+" variant="error" />}
          {row.translation_status === 'translated' ? (
            <Badge label="已譯中文" variant="success" />
          ) : (
            <Badge label="未譯" variant="warning" />
          )}
          <AstryxLink href={row.source_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 12 }}>
            原文 ↗
          </AstryxLink>
        </Stack>

        {row.image_url && (
          <a href={row.image_url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.image_url} alt="" loading="lazy"
              style={{ height: 96, width: 128, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }} />
          </a>
        )}

        <h2 style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>{row.title_zh || row.title_ja}</h2>
        {row.summary_zh && <p style={{ margin: 0, fontSize: 12, color: '#6d4a58', lineHeight: 1.6 }}>{row.summary_zh}</p>}

        <Button label={showJa ? '收起日文原文' : '睇日文原文'} variant="ghost" size="sm" width="hug" onClick={() => setShowJa((v) => !v)} />
        {showJa && (
          <div style={{ fontSize: 11, color: '#8a6a78' }}>
            <p style={{ margin: '4px 0', fontWeight: 600 }} lang="ja">{row.title_ja}</p>
            {row.summary_ja && <p style={{ margin: 0, lineHeight: 1.6 }} lang="ja">{row.summary_ja}</p>}
          </div>
        )}

        <Divider />
        <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
          {row.status !== 'published' && (
            <Button label="發布" variant="primary" size="sm" isLoading={busy} isDisabled={busyId !== null}
              onClick={() => onAsk(row, 'approve')} />
          )}
          {row.status !== 'rejected' && (
            <Button label="拒絕" variant="destructive" size="sm" isDisabled={busyId !== null}
              onClick={() => onAsk(row, 'reject')} />
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a08893', textTransform: 'uppercase' }}>
            #{row.id} · {row.status}
          </span>
        </Stack>
      </Stack>
    </Card>
  );
}

function NewsAstryxApp({ embeddedToken, embedded = false }: { embeddedToken?: string; embedded?: boolean } = {}) {
  const toast = useToast();
  const [token, setToken] = useState(embeddedToken ?? '');
  const [authed, setAuthed] = useState(!!embeddedToken);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState<string>('pending');
  const [rows, setRows] = useState<NewsRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [ask, setAsk] = useState<{ row: NewsRow; action: 'approve' | 'reject' } | null>(null);

  useEffect(() => {
    if (embeddedToken) { setToken(embeddedToken); setAuthed(true); return; }
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) { setToken(saved); setAuthed(true); }
  }, [embeddedToken]);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/news?status=${status}&limit=100`, { headers: { 'x-admin-token': tk } });
      if (res.status === 401) {
        setAuthed(false); setAuthErr('Token 唔啱'); setRows([]);
      } else {
        const data = await res.json();
        setRows(data.items || []);
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

  async function confirmAction() {
    if (!ask) return;
    const { row, action } = ask;
    setBusyId(row.id);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: row.id, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ body: action === 'approve' ? `已發布 #${row.id}` : `已拒絕 #${row.id}`, type: action === 'approve' ? 'info' : 'error' });
      setAsk(null);
      await load(tab, token);
    } catch (err) {
      toast({ body: `操作失敗：${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '64px 16px' }}>
        <Card padding={6}>
          <Stack direction="vertical" gap={3}>
            <h1 style={{ margin: 0, fontSize: 18 }}>女優情報審批 · Astryx</h1>
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
    <main style={embedded ? undefined : { maxWidth: 860, margin: '0 auto', padding: '28px 16px 96px' }}>
      <Stack direction="horizontal" justify="between" align="center" wrap="wrap" gap={2}>
        <div>
          <h1 style={{ margin: 0, fontSize: embedded ? 17 : 20 }}>女優情報審批</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8a6a78' }}>
            pending 唔會公開；按「發布」先會出現喺 /news。
          </p>
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
        <Card padding={6}><p style={{ textAlign: 'center', margin: 0, color: '#8a6a78' }}>暫無項目</p></Card>
      ) : (
        <Stack direction="vertical" gap={3}>
          {rows.map((row) => (
            <NewsCard key={row.id} row={row} token={token} onChanged={() => load(tab, token)} onAsk={(r, a) => setAsk({ row: r, action: a })} busyId={busyId} />
          ))}
        </Stack>
      )}

      <Dialog isOpen={!!ask} onOpenChange={(open) => { if (!open) setAsk(null); }} purpose="form" width={420} aria-label="確認操作">
        <Stack direction="vertical" gap={3} style={{ padding: 24 }}>
          <DialogHeader title={ask?.action === 'approve' ? '確認發布？' : '確認拒絕？'} />
          <p style={{ margin: 0, fontSize: 14 }}>{ask?.row.title_zh || ask?.row.title_ja}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#8a6a78' }}>
            {ask?.action === 'approve'
              ? '發布後會出現喺公開 /news，並自動補封面、寫入審批 log。'
              : '拒絕後狀態變 rejected，唔會公開，記錄保留喺 news_moderation_log。'}
          </p>
          <Divider />
          <Stack direction="horizontal" gap={2} justify="end">
            <Button label="取消" variant="secondary" onClick={() => setAsk(null)} />
            <Button
              label={ask?.action === 'approve' ? '確認發布' : '確認拒絕'}
              variant={ask?.action === 'approve' ? 'primary' : 'destructive'}
              isLoading={busyId !== null}
              onClick={confirmAction}
            />
          </Stack>
        </Stack>
      </Dialog>
    </main>
  );
}

// Standalone (full login gate) usage — e.g. the dedicated /admin/news-astryx route.
export function NewsAstryxStandalone() {
  return (
    <Theme theme={adminTheme} mode="light">
      <NewsAstryxApp />
    </Theme>
  );
}

// Embeddable panel for the unified /admin shell (auth already handled upstream
// via embeddedToken). Carries its own Theme so the nadeshiko tokens + Tailwind
// shim apply inside the shell without touching the rest of the admin.
export default function NewsAstryxPanel({ embeddedToken }: { embeddedToken?: string }) {
  return (
    <Theme theme={adminTheme} mode="light">
      <NewsAstryxApp embeddedToken={embeddedToken} embedded />
    </Theme>
  );
}
