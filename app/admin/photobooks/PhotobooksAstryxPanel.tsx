'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Stack,
  Divider,
  Spinner,
  TabList,
  Tab,
  TextInput,
  CheckboxInput,
  Dialog,
  DialogHeader,
  EmptyState,
  useToast,
  Link as AstryxLink,
} from '@astryxdesign/core';
import { AstryxShell } from '../_astryx/AstryxShell';

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
] as const;

const STATUS_TONE: Record<string, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  published: 'success',
  rejected: 'neutral',
};

function BookCard({
  row,
  token,
  onChanged,
  selected,
  onToggle,
  busyIsbn,
  setBusyIsbn,
  toast,
}: {
  row: PbRow;
  token: string;
  onChanged: () => void;
  selected: boolean;
  onToggle: (isbn: string) => void;
  busyIsbn: string | null;
  setBusyIsbn: (v: string | null) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [price, setPrice] = useState<string>(row.price_jpy != null ? String(row.price_jpy) : '');
  const [note, setNote] = useState<string>(row.order_note || '');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const isBusy = busyIsbn === row.isbn;

  async function act(action: 'approve' | 'reject') {
    setBusy(action); setBusyIsbn(row.isbn);
    try {
      const res = await fetch('/api/admin/photobooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ isbn: row.isbn, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ body: action === 'approve' ? `已發布 ${row.isbn}` : `已拒絕 ${row.isbn}`, type: action === 'approve' ? 'info' : 'error' });
      onChanged();
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally { setBusy(null); setBusyIsbn(null); }
  }

  async function saveMeta() {
    setSavingMeta(true);
    try {
      const res = await fetch('/api/admin/photobooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          isbn: row.isbn, action: 'update',
          price_jpy: price ? Number(price) : null,
          order_note: note || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ body: `已更新定價/備註 ${row.isbn}`, type: 'info' });
      onChanged();
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally { setSavingMeta(false); }
  }

  return (
    <Card padding={3}>
      <Stack direction="horizontal" gap={3} align="start">
        {row.status === 'pending' && (
          <div style={{ paddingTop: 4 }}>
            <CheckboxInput label={`選擇 ${row.book_title}`} isLabelHidden value={selected} onChange={() => onToggle(row.isbn)} />
          </div>
        )}
        <div style={{ height: 112, width: 80, flexShrink: 0, overflow: 'hidden', borderRadius: 10, background: '#f3f4f6' }}>
          {row.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.cover_url} alt={row.book_title} style={{ height: '100%', width: '100%', objectFit: 'cover' }} loading="lazy" />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📕</div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Stack direction="horizontal" justify="between" align="start" gap={2}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                {row.actress_name ? `${row.actress_name}　` : ''}
                <span style={{ fontWeight: 400, color: '#4a3640' }}>{row.book_title}</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a08893' }}>
                {row.publisher}
                {row.photographer ? `　攝：${row.photographer}` : ''}
                {row.release_date ? `　${row.release_date.slice(0, 7)}` : ''}
                {`　ISBN ${row.isbn}`}
              </p>
            </div>
            <Badge label={row.status} variant={STATUS_TONE[row.status] ?? 'neutral'} />
          </Stack>

          <AstryxLink href={row.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 4, fontSize: 11 }}>
            hanmoto 來源 ↗
          </AstryxLink>

          <Stack direction="horizontal" gap={2} align="end" wrap="wrap" style={{ marginTop: 8 }}>
            <div style={{ width: 110 }}>
              <TextInput label="日圓定價" size="sm" inputMode="numeric" placeholder="如 4400"
                value={price} onChange={(v) => setPrice(v.replace(/[^\d]/g, ''))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <TextInput label="備註（可空）" size="sm" placeholder="如：附特典／限量"
                value={note} onChange={setNote} />
            </div>
            <Button label={savingMeta ? '…' : '存'} variant="secondary" size="sm" isLoading={savingMeta} onClick={saveMeta} />
          </Stack>

          {row.status === 'pending' && (
            <Stack direction="horizontal" gap={2} style={{ marginTop: 8 }}>
              <Button label="發布" variant="primary" size="sm" isLoading={busy === 'approve'} isDisabled={busyIsbn !== null} onClick={() => act('approve')} />
              <Button label="拒絕" variant="destructive" size="sm" isLoading={busy === 'reject'} isDisabled={busyIsbn !== null} onClick={() => act('reject')} />
            </Stack>
          )}
        </div>
      </Stack>
    </Card>
  );
}

function PhotobooksAstryxApp({ embeddedToken, embedded = false }: { embeddedToken?: string; embedded?: boolean }) {
  const toast = useToast();
  const [token, setToken] = useState(embeddedToken ?? '');
  const [authed, setAuthed] = useState(!!embeddedToken);
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState<string>('pending');
  const [rows, setRows] = useState<PbRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState<'approve' | 'reject' | null>(null);
  const [busyIsbn, setBusyIsbn] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'approve' | 'reject'; isbns: string[] } | null>(null);

  useEffect(() => {
    if (embeddedToken) { setToken(embeddedToken); setAuthed(true); return; }
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) { setToken(saved); setAuthed(true); }
  }, [embeddedToken]);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/photobooks?status=${status}&limit=200`, { headers: { 'x-admin-token': tk } });
      if (res.status === 401) { setAuthErr('Token 唔啱'); setAuthed(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(j.items);
      setCounts(j.counts || {});
      setSelected(new Set());
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) load(tab, token); }, [authed, tab, token, load]);

  function login() {
    if (token.trim()) { sessionStorage.setItem('admin_token', token.trim()); setAuthed(true); }
  }

  const toggle = useCallback((isbn: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(isbn)) next.delete(isbn); else next.add(isbn);
      return next;
    });
  }, []);

  const pendingRows = (rows || []).filter((r) => r.status === 'pending');
  const allSelected = pendingRows.length > 0 && pendingRows.every((r) => selected.has(r.isbn));
  const someSelected = pendingRows.some((r) => selected.has(r.isbn));
  const selectAllValue: boolean | 'indeterminate' = allSelected ? true : someSelected ? 'indeterminate' : false;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pendingRows.map((r) => r.isbn)));
  }

  // 一鍵選取符合規則嘅 pending：有封面＋有定價＋2020-01-01 後出版
  function selectQualified() {
    const qualified = pendingRows
      .filter((r) =>
        !!r.cover_url && r.price_jpy != null && !!r.release_date &&
        new Date(r.release_date) >= new Date('2020-01-01T00:00:00Z'))
      .map((r) => r.isbn);
    setSelected(new Set(qualified));
    toast({ body: `已選取 ${qualified.length} 本合資格（2020 後、有封面定價）`, type: 'info' });
  }

  async function runBatch() {
    if (!confirm) return;
    const isbns = confirm.isbns.filter((i) => /^\d{13}$/.test(i));
    setBatchBusy(confirm.action);
    try {
      const res = await fetch('/api/admin/photobooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action: confirm.action, isbns }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      toast({
        body: `已${confirm.action === 'approve' ? '發布' : '拒絕'} ${j.updated} 本${j.skipped?.length ? `，跳過 ${j.skipped.length} 本（非 pending）` : ''}`,
        type: confirm.action === 'approve' ? 'info' : 'error',
      });
      setConfirm(null);
      setSelected(new Set());
      await load(tab, token);
    } catch (e) {
      toast({ body: e instanceof Error ? e.message : String(e), type: 'error' });
    } finally { setBatchBusy(null); }
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '64px 16px' }}>
        <Card padding={6}>
          <Stack direction="vertical" gap={3}>
            <h1 style={{ margin: 0, fontSize: 18 }}>寫真集審批 · Astryx</h1>
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
    <main style={embedded ? undefined : { maxWidth: 900, margin: '0 auto', padding: '28px 16px 96px' }}>
      <Stack direction="horizontal" justify="between" align="center" gap={2} wrap="wrap">
        <div>
          <h1 style={{ margin: 0, fontSize: embedded ? 17 : 20 }}>女優寫真集審批</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8a6a78' }}>
            pending 唔會公開；按「發布」先會出現喺首頁寫真集區。落單跳 WhatsApp。
          </p>
        </div>
        <Button label="重新整理" variant="secondary" size="sm" isLoading={loading} onClick={() => load(tab, token)} />
      </Stack>

      <div style={{ margin: '16px 0' }}>
        <TabList value={tab} onChange={setTab}>
          {TABS.map((t) => <Tab key={t.key} value={t.key} label={`${t.label}${counts[t.key] != null ? ` (${counts[t.key]})` : ''}`} />)}
        </TabList>
      </div>

      {tab === 'pending' && pendingRows.length > 0 && (
        <Card padding={3} style={{ position: 'sticky', top: 8, zIndex: 10 }}>
          <Stack direction="horizontal" align="center" gap={2} wrap="wrap">
            <CheckboxInput label="全選" value={selectAllValue} onChange={toggleAll} />
            <Button label="選取 2020 後" variant="ghost" size="sm" onClick={selectQualified} />
            <span style={{ fontSize: 12, color: '#8a6a78' }}>已選 {selected.size} 本</span>
            <Stack direction="horizontal" gap={2} style={{ marginLeft: 'auto' }}>
              <Button label="批量發布" variant="primary" size="sm" isLoading={batchBusy === 'approve'}
                isDisabled={batchBusy !== null || selected.size === 0}
                onClick={() => setConfirm({ action: 'approve', isbns: [...selected] })} />
              <Button label="批量拒絕" variant="destructive" size="sm" isLoading={batchBusy === 'reject'}
                isDisabled={batchBusy !== null || selected.size === 0}
                onClick={() => setConfirm({ action: 'reject', isbns: [...selected] })} />
            </Stack>
          </Stack>
        </Card>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {loading ? (
        <Stack direction="vertical" align="center" gap={2} style={{ padding: 40 }}><Spinner size="lg" label="載入中" /></Stack>
      ) : !rows || rows.length === 0 ? (
        <EmptyState title="暫無項目" />
      ) : (
        <Stack direction="vertical" gap={3}>
          {rows.map((row) => (
            <BookCard key={row.isbn} row={row} token={token} onChanged={() => load(tab, token)}
              selected={selected.has(row.isbn)} onToggle={toggle} busyIsbn={busyIsbn} setBusyIsbn={setBusyIsbn} toast={toast} />
          ))}
        </Stack>
      )}

      <Dialog isOpen={!!confirm} onOpenChange={(open) => { if (!open) setConfirm(null); }}
        purpose="form" width={440} aria-label="批量操作確認">
        <Stack direction="vertical" gap={3} style={{ padding: 24 }}>
          <DialogHeader title={confirm?.action === 'approve' ? `批量發布 ${confirm?.isbns.length} 本？` : `批量拒絕 ${confirm?.isbns.length} 本？`} />
          <p style={{ margin: 0, fontSize: 12, color: '#8a6a78' }}>
            只會改動 pending 項，已審批嘅會自動跳過（冪等）。
          </p>
          <Divider />
          <Stack direction="horizontal" gap={2} justify="end">
            <Button label="取消" variant="secondary" onClick={() => setConfirm(null)} />
            <Button label={confirm?.action === 'approve' ? '確認發布' : '確認拒絕'}
              variant={confirm?.action === 'approve' ? 'primary' : 'destructive'}
              isLoading={batchBusy !== null} onClick={runBatch} />
          </Stack>
        </Stack>
      </Dialog>
    </main>
  );
}

export function PhotobooksAstryxStandalone() {
  return <AstryxShell><PhotobooksAstryxApp /></AstryxShell>;
}

export default function PhotobooksAstryxPanel({ embeddedToken }: { embeddedToken?: string }) {
  return <AstryxShell><PhotobooksAstryxApp embeddedToken={embeddedToken} embedded /></AstryxShell>;
}
