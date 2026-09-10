'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

// 18禁年齡閘門：所有人當日第一次進站都要確認一次。
// 用香港時區（UTC+8）嘅日期做 key，過咗午夜要再確認。
const STORAGE_KEY = 'jstar-…date';

function hkDateString(d: Date) {
  // 直接用 +8 偏移，唔依賴用戶機時區
  const hk = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return hk.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function AgeGate() {
  // mount 前唔渲染，避免 SSR hydration 唔夾
  const [state, setState] = useState<'checking' | 'show' | 'denied' | 'ok'>('checking');

  useEffect(() => {
    try {
      const today = hkDateString(new Date());
      if (localStorage.getItem(STORAGE_KEY) === today) {
        setState('ok');
      } else {
        setState('show');
        document.body.style.overflow = 'hidden';
      }
    } catch {
      // localStorage 唔可用（private mode 等）→ 保守起見照彈
      setState('show');
      document.body.style.overflow = 'hidden';
    }
  }, []);

  function confirm() {
    try {
      localStorage.setItem(STORAGE_KEY, hkDateString(new Date()));
    } catch {
      /* 就算儲唔到都放行（session 內），reload 先會再彈 */
    }
    document.body.style.overflow = '';
    setState('ok');
  }

  function deny() {
    setState('denied');
  }

  function backToConfirm() {
    // 誤按「未滿18」嘅補救路徑：返確認頁（未記任何嘢，重新揀過）
    setState('show');
  }

  if (state === 'checking' || state === 'ok') return null;

  // denied 用實色底，唔俾內容輪廓透出；show 用半透 + blur
  const overlayClass =
    state === 'denied'
      ? 'fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#1c1218]'
      : 'fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#1c1218]/80 backdrop-blur-sm';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="agegate-title" className={overlayClass}>
      <div className="w-full max-w-sm md:max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-[agegateIn_0.25s_ease-out]">
        {/* 頂部品牌色帶 */}
        <div className="bg-gradient-to-r from-[rgb(var(--color-wine))] to-[rgb(var(--color-nadeshiko-dark))] px-6 py-6 text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-white/15 flex items-center justify-center ring-1 ring-white/30">
            {state === 'denied' ? (
              <Lock className="w-6 h-6 text-white" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-white" />
            )}
          </div>
          <p className="text-white/90 text-xs tracking-[0.3em] font-semibold">18+ AGE VERIFICATION</p>
        </div>

        <div className="px-6 py-6 text-center">
          {state === 'show' ? (
            <>
              <h2 id="agegate-title" className="text-lg font-bold text-text-primary mb-2">
                本網站含成人限定內容
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-1">
                J-STAR CALENDAR 收錄日本成人影視女優嘅
                <span className="font-bold text-[rgb(var(--color-wine))]">活動、見面會情報</span>
                ，僅供年滿 <span className="font-bold text-[rgb(var(--color-wine))]">18 歲</span> 人士瀏覽。
              </p>
              <p className="text-xs text-text-tertiary mb-4">
                進入即表示你確認自己已年滿 18 歲，並同意遵守當地法例。每日首次進站需確認一次。
              </p>
              <p className="text-xs font-medium text-[rgb(var(--color-nadeshiko-strong))] mb-6">
                免費瀏覽 · 無需登記
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={confirm}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[rgb(var(--color-nadeshiko-strong))] to-[rgb(var(--color-nadeshiko-dark))] text-white font-bold text-sm shadow-lg shadow-pink-300/30 hover:opacity-95 active:scale-[0.98] transition"
                >
                  我已年滿 18 歲，進入網站
                </button>
                <button
                  onClick={deny}
                  className="w-full min-h-[48px] rounded-xl border-2 border-[rgba(var(--color-sakura-gray),0.9)] text-text-secondary font-semibold text-sm hover:bg-[rgba(var(--color-sakura-gray),0.2)] active:scale-[0.98] transition"
                >
                  我未滿 18 歲，離開
                </button>
              </div>
              <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-text-tertiary">
                <a href="/terms" className="underline underline-offset-2 hover:text-text-secondary">
                  使用條款
                </a>
                <span aria-hidden>·</span>
                <a href="/privacy" className="underline underline-offset-2 hover:text-text-secondary">
                  私隱政策
                </a>
              </div>
            </>
          ) : (
            <>
              <h2 id="agegate-title" className="text-lg font-bold text-text-primary mb-2">
                抱歉，你未能進入
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                本網站內容僅限 18 歲或以上人士。請按下方離開網站。
              </p>
              <a
                href="https://www.google.com"
                className="block w-full min-h-[48px] leading-[48px] rounded-xl bg-[rgb(var(--color-umenezumi))] text-white font-bold text-sm text-center hover:opacity-95 active:scale-[0.98] transition"
              >
                離開網站
              </a>
              <button
                onClick={backToConfirm}
                className="mt-3 w-full min-h-[44px] text-xs font-medium text-text-tertiary underline underline-offset-2 hover:text-text-secondary"
              >
                我撳錯咗，返回確認
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
