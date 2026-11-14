'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { RowsPhotoAlbum } from 'react-photo-album';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import {
  compressFanPhoto,
  formatMb,
  FanPhotoCompressError,
  type CompressedFanPhoto,
} from '@/lib/fan-photos/compress';
import type { Photo as RpaPhoto } from 'react-photo-album';

interface FanPhoto {
  id: number;
  blob_url: string;
  thumbnail_url: string;
  caption: string | null;
  submitter_name: string | null;
  event_id: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface ActressEvent {
  id: string;
  title: string;
  datetime: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const TG_OR_EMAIL = /^(@?[a-zA-Z0-9_]{4,32}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export default function FanPhotoSection({
  actressId,
  events,
}: {
  actressId: string;
  events: ActressEvent[];
}) {
  const [showForm, setShowForm] = useState(false);
  const { data, mutate, isLoading } = useSWR(
    `/api/fan-photos?actressId=${actressId}&pageSize=60`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );
  const photos: FanPhoto[] = data?.data || [];

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-japanese text-xl font-bold text-text-primary flex items-center gap-2">
          <span className="text-pink-600">●</span>
          粉絲相冊
          <span className="text-text-secondary font-normal text-sm">
            （活動現場靚相，{photos.length} 張）
          </span>
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-700 transition-colors"
        >
          📷 上傳活動相
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-text-tertiary">載入中…</div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-bg-primary py-10 text-center">
          <p className="text-3xl mb-2">📸</p>
          <p className="text-text-secondary text-sm">仲未有粉絲相</p>
          <p className="text-text-tertiary text-xs mt-1">上傳第一張活動現場靚相，管理員審批後會顯示喺度</p>
        </div>
      ) : (
        <PhotoProvider maskOpacity={0.85}>
          <RowsPhotoAlbum<RpaPhoto>
            spacing={8}
            targetRowHeight={200}
            photos={photos.map<RpaPhoto>((p) => ({
              src: p.thumbnail_url || p.blob_url,
              width: p.width || 3,
              height: p.height || 4,
              alt: p.caption || `粉絲相 #${p.id}`,
            }))}
            render={{
              photo: (_, { photo, index }) => (
                <PhotoView key={index} src={photo.src}>
                  <div className="relative group cursor-zoom-in overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.alt || ''}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </PhotoView>
              ),
            }}
          />
        </PhotoProvider>
      )}

      {showForm && (
        <UploadModal
          actressId={actressId}
          events={events}
          onClose={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false);
            mutate();
          }}
        />
      )}
    </section>
  );
}

function UploadModal({
  actressId,
  events,
  onClose,
  onDone,
}: {
  actressId: string;
  events: ActressEvent[];
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [compressed, setCompressed] = useState<CompressedFanPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [contact, setContact] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [caption, setCaption] = useState('');
  const [eventId, setEventId] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleFile(file: File | undefined) {
    setError('');
    if (!file) return;
    try {
      const result = await compressFanPhoto(file);
      setCompressed(result);
      setPreviewUrl(URL.createObjectURL(result.blob));
    } catch (e) {
      setCompressed(null);
      setError(e instanceof FanPhotoCompressError ? e.message : '圖片處理失敗，請試另一張');
    }
  }

  async function submit() {
    setError('');
    if (!compressed) return setError('請先揀圖片');
    if (!TG_OR_EMAIL.test(contact.trim())) return setError('請填有效 Telegram handle 或 email');
    if (!agreed) return setError('請先勾選版權聲明');

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', compressed.blob, 'fan-photo.jpg');
      fd.append('actressId', actressId);
      fd.append('contact', contact.trim());
      fd.append('width', String(compressed.width));
      fd.append('height', String(compressed.height));
      if (submitterName.trim()) fd.append('submitterName', submitterName.trim());
      if (caption.trim()) fd.append('caption', caption.trim());
      if (eventId) fd.append('eventId', eventId);

      const res = await fetch('/api/fan-photos', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setDone(true);
      setTimeout(onDone, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上傳失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-10 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-bold text-text-primary">收到！</p>
            <p className="text-sm text-text-tertiary mt-1">管理員審批後會喺女優頁顯示</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">上傳活動相</h3>
              <button onClick={onClose} className="text-text-tertiary text-xl leading-none">✕</button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {previewUrl ? (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="預覽" className="max-h-64 mx-auto rounded-lg border" />
                {compressed && (
                  <p className="mt-2 text-center text-xs text-text-tertiary">
                    {formatMb(compressed.originalSize)} → {formatMb(compressed.fileSize)}
                    （{compressed.width}×{compressed.height}，質量 {compressed.quality}）
                  </p>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mx-auto mt-2 block text-xs text-pink-600 hover:underline"
                >
                  重選另一張
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="mb-3 w-full rounded-xl border-2 border-dashed border-pink-300 py-10 text-sm text-pink-600 hover:bg-pink-50"
              >
                📁 揀圖片（JPEG/PNG/WebP，自動壓縮至 3MB 內）
              </button>
            )}

            {events.length > 0 && (
              <label className="block mb-3 text-xs text-text-tertiary">
                標註活動（選填）
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-text-primary"
                >
                  <option value="">唔標註活動</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}（{ev.datetime?.slice(0, 10)}）
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block mb-3 text-xs text-text-tertiary">
              聯絡方法（必填，TG handle 或 email，唔會公開）
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@yourhandle 或 you@email.com"
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-text-primary"
              />
            </label>

            <label className="block mb-3 text-xs text-text-tertiary">
              顯示名稱（選填，預設「匿名粉絲」）
              <input
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value.slice(0, 60))}
                placeholder="匿名粉絲"
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-text-primary"
              />
            </label>

            <label className="block mb-3 text-xs text-text-tertiary">
              留言（選填）
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="例如：11/21 旺角場，好有氣質！"
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-text-primary"
              />
            </label>

            <label className="flex items-start gap-2 mb-3 text-xs text-text-secondary">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-pink-600" />
              <span>我確認擁有呢張相嘅版權／獲授權上傳，內容為活動現場拍攝，同意 JCHING 於女優頁展示。</span>
            </label>

            {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}

            <button
              onClick={submit}
              disabled={busy || !compressed}
              className="w-full rounded-lg bg-pink-600 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-40"
            >
              {busy ? '上傳中…' : '提交審批'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
