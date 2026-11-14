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
  CheckboxInput,
  Dialog,
  DialogHeader,
  EmptyState,
  useToast,
} from '@astryxdesign/core';
import { AstryxShell } from '../_astryx/AstryxShell';

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
] as const;

const STATUS_TONE: Record<string, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  published: 'success',
  rejected: 'neutral',
};

function PhotoCard({
  row,
  token,
  onChanged,
  selected,
  onToggle,
  busyId,
  setBusyId,
  toast,
}: {
  row: FanPhotoRow;
  token: string;
  onChanged: () => void;
  selected: boolean;
  onToggle: (id: number) => void;
  busyId: number | null;
  setBusyId: (v: number | null) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const busy = busyId === row.id;

  async function act(action: 'approve' | 'reject') {
    setBusyId(row.id);
    try {
      const res = await fetch('/api/admin/fan-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id: row.id, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ body: action === 'approve' ? `已發布 #${row.id}` : `已拒絕 #${row.id}`, type: action === 'approve' ? 'info' : 'error' });
      onChanged();
    } catch (e) {
      toast({ body: e instanceof Error ? e.message : String(e), type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card padding={3}>
      <Stack direction="horizontal" gap={3} align="start">
        {row.status === 'pending' && (
          <div style={{ paddingTop: 4 }}>
            <CheckboxInput label={`選擇 #${row.id}`} isLabelHidden value={selected} onChange={() => onToggle(row.id)} />
          </div>
        )}
        <a href={row.blob_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.thumbnail_url || row.blob_url}
            alt={row.caption || `#${row.id}`}
            loading="lazy"
            style={{ height: 112, width: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }}
          />
        </a>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Stack direction="horizontal" justify="between" align="start" gap={2}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                女優 id {row.actress_id}
                {row.event_id && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: '#a08893' }}>活動 {row.event_id}</span>}
              </p>
              {row.caption && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4a3640' }}>「{row.caption}」</p>}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a08893' }}>
                聯絡：{row.submitter_contact}　名稱：{row.submitter_name || '匿名粉絲'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#a08893' }}>
                IP：{row.ip || '?'}　{row.width}×{row.height}
                {row.file_size ? `　${(row.file_size / 1048576).toFixed(2)}MB` : ''}　{row.created_at.slice(0, 16).replace('T', ' ')}
              </p>
              {row.admin_note && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8a6a78' }}>備註：{row.admin_note}</p>}
            </div>
            <Badge label={row.status} variant={STATUS_TONE[row.status] ?? 'neutral'} />
          </Stack>

          {row.status === 'pending' && (
            <Stack direction="horizontal" gap={2} style={{ marginTop: 10 }}>
              <Button label="發布" variant="primary" size="sm" isLoading={busy} isDisabled={busyId !== null} onClick={() => act('approve')} />
              <Button label="拒絕" variant="destructive" size="sm" isDisabled={busyId !== null} onClick={() => act('reject')} />
            </Stack>
          )}
        </div>
      </Stack>
    </Card>
  );
}

function FanPhotosAstryxApp({ embeddedToken, embedded = false }: { embeddedToken?: string; embedded?: boolean }) {
  const toast = useToast();
  const [token, setToken] = useState(embeddedToken ?? '');
  const [tab, setTab] = useState<string>('pending');
  const [rows, setRows] = useState<FanPhotoRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchBusy, setBatchBusy] = useState<'approve' | 'reject' | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'approve' | 'reject'; ids: number[] } | null>(null);

  useEffect(() => {
    if (embeddedToken) setToken(embeddedToken);
    else {
      const saved = sessionStorage.getItem('admin_token') || '';
      if (saved) setToken(saved);
    }
  }, [embeddedToken]);

  const load = useCallback(async (status: string, tk: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fan-photos?status=${status}`, { headers: { 'x-admin-token': tk } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(j.items);
      setCounts(j.counts || {});
      setSelected(new Set());
    } catch (e) {
      toast({ body: e instanceof Error ? e.message : String(e), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (token) load(tab, token); }, [token, tab, load]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const pendingRows = (rows || []).filter((r) => r.status === 'pending');
  const allSelected = pendingRows.length > 0 && pendingRows.every((r) => selected.has(r.id));
  const someSelected = pendingRows.some((r) => selected.has(r.id));
  const selectAllValue: boolean | 'indeterminate' = allSelected ? true : someSelected ? 'indeterminate' : false;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pendingRows.map((r) => r.id)));
  }

  async function runBatch() {
    if (!confirm) return;
    const ids = confirm.ids;
    setBatchBusy(confirm.action);
    try {
      const res = await fetch('/api/admin/fan-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action: confirm.action, ids }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      toast({
        body: `已處理 ${j.updated} 張${j.skipped?.length ? `，跳過 ${j.skipped.length} 張（非 pending）` : ''}`,
        type: confirm.action === 'approve' ? 'info' : 'error',
      });
      setConfirm(null);
      setSelected(new Set());
      await load(tab, token);
    } catch (e) {
      toast({ body: e instanceof Error ? e.message : String(e), type: 'error' });
    } finally {
      setBatchBusy(null);
    }
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontSize: embedded ? 17 : 20 }}>粉絲相冊審批</h1>

      <Stack direction="horizontal" justify="between" align="center" gap={2} wrap="wrap">
        <TabList value={tab} onChange={setTab}>
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={`${t.label}${counts[t.key] != null ? ` (${counts[t.key]})` : ''}`} />
          ))}
        </TabList>
        <Button label="重新整理" variant="secondary" size="sm" isLoading={loading} onClick={() => load(tab, token)} />
      </Stack>

      {tab === 'pending' && pendingRows.length > 0 && (
        <Card padding={3} style={{ marginTop: 12, position: 'sticky', top: 8, zIndex: 10 }}>
          <Stack direction="horizontal" align="center" gap={3} wrap="wrap">
            <CheckboxInput label="全選" value={selectAllValue} onChange={toggleAll} />
            <span style={{ fontSize: 12, color: '#8a6a78' }}>已選 {selected.size} 張</span>
            <Stack direction="horizontal" gap={2} style={{ marginLeft: 'auto' }}>
              <Button label="批量發布" variant="primary" size="sm" isLoading={batchBusy === 'approve'}
                isDisabled={batchBusy !== null || selected.size === 0}
                onClick={() => setConfirm({ action: 'approve', ids: [...selected] })} />
              <Button label="批量拒絕" variant="destructive" size="sm" isLoading={batchBusy === 'reject'}
                isDisabled={batchBusy !== null || selected.size === 0}
                onClick={() => setConfirm({ action: 'reject', ids: [...selected] })} />
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
            <PhotoCard key={row.id} row={row} token={token} onChanged={() => load(tab, token)}
              selected={selected.has(row.id)} onToggle={toggle} busyId={busyId} setBusyId={setBusyId} toast={toast} />
          ))}
        </Stack>
      )}

      <Dialog isOpen={!!confirm} onOpenChange={(open) => { if (!open) setConfirm(null); }}
        purpose="form" width={440} aria-label="批量操作確認">
        <Stack direction="vertical" gap={3} style={{ padding: 24 }}>
          <DialogHeader title={confirm?.action === 'approve' ? `批量發布 ${confirm?.ids.length} 張？` : `批量拒絕 ${confirm?.ids.length} 張？`} />
          <p style={{ margin: 0, fontSize: 12, color: '#8a6a78' }}>
            只會改動 pending 項目，已審批嘅會自動跳過（冪等）。動作寫入審批記錄。
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
    </div>
  );
}

export default function FanPhotosAstryxPanel({ embeddedToken }: { embeddedToken?: string }) {
  return <AstryxShell><FanPhotosAstryxApp embeddedToken={embeddedToken} embedded /></AstryxShell>;
}
