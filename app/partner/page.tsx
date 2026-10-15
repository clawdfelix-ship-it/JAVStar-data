'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { normalizePartnerTarget } from '@/lib/event-utils';

// 合作夥伴場次中繼頁（18+ 確認）。
// JCHING 日曆保持中立：活動卡只連到呢個站內頁，確認年齡＋離站後先跳外部售票。
// 外部網址只經 ?to= 傳入並在瀏覽器端跳轉，唔會喺伺服器端暴露。
function GateInner() {
  const sp = useSearchParams();
  const to = sp.get('to') || '';
  const title = sp.get('title') || '合作夥伴活動';
  const [leaving, setLeaving] = useState(false);

  // 簡單防濫用：to 必須係 http(s)
  const safeTo = normalizePartnerTarget(to);

  useEffect(() => {
    if (!leaving || !safeTo) return;
    // 留一點時間顯示提示
    const t = setTimeout(() => { window.location.href = safeTo; }, 1200);
    return () => clearTimeout(t);
  }, [leaving, safeTo]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm text-center">
        <div className="text-4xl">🎟️</div>
        <h1 className="mt-4 text-lg font-bold text-[rgb(var(--color-umenezumi-light))]">
          合作夥伴場次
        </h1>
        <p className="mt-2 text-sm text-[rgb(var(--color-umenezumi-light))]/70">
          你即將離開 JCHING 日曆，前往第三方主辦單位嘅售票頁面：
        </p>
        <p className="mt-2 rounded-lg bg-[rgb(var(--color-nadeshiko-light))]/20 px-3 py-2 text-sm font-medium text-[rgb(var(--color-wine))]">
          {title}
        </p>

        <div className="mt-6 rounded-xl border border-[rgba(var(--color-sakura-gray),0.6)] p-4 text-left text-xs leading-relaxed text-[rgb(var(--color-umenezumi-light))]/70">
          <p className="font-semibold text-[rgb(var(--color-umenezumi-light))]">⚠ 18+ 內容確認</p>
          <p className="mt-1">
            此活動由第三方主辦，可能包含成人內容，只適合 18 歲或以上人士。
            JCHING 只提供日程資訊，唔負責第三方頁面內容、票務或交易。
          </p>
          <label className="mt-3 flex items-center justify-center gap-2">
            <input type="checkbox" id="ageok" defaultChecked className="accent-[rgb(var(--color-nadeshiko-dark))]" />
            <span>我已年滿 18 歲，同意前往外部售票頁</span>
          </label>
        </div>

        {!safeTo ? (
          <p className="mt-6 text-xs text-red-500">售票連結無效。</p>
        ) : leaving ? (
          <p className="mt-6 text-sm text-[rgb(var(--color-umenezumi-light))]/70">正在離開 JCHING，前往售票頁…</p>
        ) : (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href="/"
              className="rounded-full border border-[rgba(var(--color-sakura-gray),0.6)] px-5 py-2 text-sm text-[rgb(var(--color-umenezumi-light))]"
            >
              返日曆
            </a>
            <button
              onClick={() => {
                const ok = (document.getElementById('ageok') as HTMLInputElement | null)?.checked;
                if (ok) setLeaving(true);
                else alert('請先確認你已年滿 18 歲');
              }}
              className="rounded-full bg-[rgb(var(--color-nadeshiko-dark))] px-5 py-2 text-sm font-bold text-white active:scale-[0.98]"
            >
              確認並前往售票
            </button>
          </div>
        )}

        <p className="mt-6 text-[10px] text-[rgb(var(--color-umenezumi-light))]/40">
          Powered by JCHING Calendar · 中立追星日程工具
        </p>
      </div>
    </main>
  );
}

export default function PartnerGate() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg px-4 py-24 text-center text-sm">載入中…</main>}>
      <GateInner />
    </Suspense>
  );
}
