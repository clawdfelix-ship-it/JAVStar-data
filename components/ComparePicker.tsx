'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import type { QuickActress } from '@/hooks/useActressSearch';

// Compare 頁專用女優揀選器（2026-09-11，搜尋藍圖 Phase 2 #5）
// 統一走 mode=quick（trigram + 假名/羅馬字/簡繁變體），
// IME composition 保護、AbortController + seq 防競態。
// 揀中後由 parent fetch /api/actresses/[id] 拎完整資料做比較。

export interface CompareActress {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  age: number | null;
  zodiac: string | null;
  cup: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  final_score: number;
}

/** 由 /api/actresses/[id] 回應映射做比較表要用嘅形狀 */
export function mapDetailToCompare(d: any): CompareActress {
  const yearEvents = d?.stats?.year_2026_events ?? 0;
  const voteCount = d?.vote_count ?? 0;
  return {
    id: d.id,
    name_ja: d.name_ja,
    name_cn: d.name_cn ?? null,
    avatar_url: d.avatar_url ?? null,
    age: d.age ?? null,
    zodiac: d.zodiac ?? null,
    cup: d.cup ?? null,
    height: d.height ?? null,
    bust: d.bust ?? null,
    waist: d.waist ?? null,
    hip: d.hip ?? null,
    agency: d.agency ?? null,
    hobby: d.hobby ?? null,
    debut_year: d.debut_year ?? null,
    event_count: d?.stats?.total_events ?? 0,
    year_2026_events: yearEvents,
    vote_count: voteCount,
    // 同列表 API 相同嘅加權（2026 活動 0.7 + 本月票數 0.3）
    final_score: Math.round((yearEvents * 0.7 + voteCount * 0.3) * 10) / 10,
  };
}

export async function fetchCompareActress(id: string): Promise<CompareActress | null> {
  try {
    const res = await fetch(`/api/actresses/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.actress ? mapDetailToCompare(d.actress) : null;
  } catch {
    return null;
  }
}

const sideStyles = {
  a: {
    accent: 'rgb(var(--color-nadeshiko-dark))',
    avatarBg: 'rgba(var(--color-nadeshiko-dark),0.2)',
    border: 'rgba(var(--color-sakura-gray),0.6)',
    hover: 'rgba(var(--color-sakura-gray),0.4)',
  },
  b: {
    accent: 'rgb(var(--color-kamenozoki-dark))',
    avatarBg: 'rgba(var(--color-kamenozoki-dark),0.2)',
    border: 'rgba(var(--color-sakura-gray),0.6)',
    hover: 'rgba(var(--color-sakura-gray),0.4)',
  },
} as const;

export default function ComparePicker({
  side,
  label,
  selected,
  loadingDetail,
  onSelect,
  onClear,
}: {
  side: 'a' | 'b';
  label: string;
  selected: CompareActress | null;
  loadingDetail?: boolean;
  onSelect: (a: CompareActress) => void;
  onClear: () => void;
}) {
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<QuickActress[]>([]);
  const [searching, setSearching] = useState(false);
  const composingRef = useRef(false);
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const s = sideStyles[side];

  useEffect(() => {
    if (composingRef.current || selected) return;
    const q = kw.trim();
    const cjk = /[㐀-鿿぀-ヿ豈-﫿]/.test(q);
    if (!q || (!cjk && q.length < 2)) {
      setResults([]);
      setSearching(false);
      abortRef.current?.abort();
      return;
    }
    setSearching(true);
    const seq = ++seqRef.current;
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetch(`/api/actresses?mode=quick&search=${encodeURIComponent(q)}&limit=9`, {
        signal: ctrl.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => {
          if (seq !== seqRef.current) return;
          setResults(d.data || []);
        })
        .catch((err) => {
          if (err?.name === 'AbortError' || seq !== seqRef.current) return;
          setResults([]);
        })
        .finally(() => {
          if (seq === seqRef.current) setSearching(false);
        });
    }, 200);
    return () => clearTimeout(t);
  }, [kw, selected]);

  const pick = useCallback(
    async (a: QuickActress) => {
      // 即刻用 quick 欄位塞個殼，詳情回來再補（parent 控制 selected）
      const shell: CompareActress = {
        id: a.id, name_ja: a.name_ja, name_cn: a.name_cn, avatar_url: a.avatar_url,
        age: null, zodiac: null, cup: null, height: null, bust: null, waist: null,
        hip: null, agency: null, hobby: null, debut_year: null,
        event_count: 0, year_2026_events: a.year_2026_events, vote_count: 0, final_score: 0,
      };
      setKw('');
      setResults([]);
      onSelect(shell);
      const full = await fetchCompareActress(a.id);
      if (full) onSelect(full);
    },
    [onSelect]
  );

  return (
    <div className="bg-white rounded-xl p-4 border" style={{ borderColor: s.border }}>
      <div className="text-xs text-[rgb(var(--color-umenezumi-light))] mb-2">{label}</div>
      {selected ? (
        <div className="flex items-center gap-3">
          {selected.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
              style={{ backgroundColor: s.avatarBg, color: s.accent }}>
              {selected.name_ja[0]}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{selected.name_ja}</div>
            {selected.name_cn && <div className="text-[rgb(var(--color-umenezumi-light))] text-xs truncate">{selected.name_cn}</div>}
            {loadingDetail && <div className="text-[10px] text-[rgb(var(--color-umenezumi-light))]">載入資料中…</div>}
          </div>
          <button onClick={onClear} className="ml-auto text-xs hover:underline shrink-0" style={{ color: s.accent }}>
            移除
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-umenezumi-light))] pointer-events-none" />
            <input
              type="text"
              placeholder="搜尋日文名／假名／羅馬字…"
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; setKw((v) => v); }}
              className="w-full bg-white border rounded-lg pl-9 pr-8 py-2 text-sm text-[rgb(var(--color-umenezumi))] placeholder-[rgb(var(--color-umenezumi-light))] focus:outline-none"
              style={{ borderColor: s.border }}
            />
            {searching ? (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[rgb(var(--color-umenezumi-light))]" />
            ) : kw ? (
              <button
                type="button"
                aria-label="清除"
                onClick={() => setKw('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--color-umenezumi-light))] hover:text-[rgb(var(--color-umenezumi))]"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          {kw.trim() && (
            <div className="mt-1 space-y-0.5 max-h-52 overflow-y-auto">
              {searching && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-[rgb(var(--color-umenezumi-light))]">搜尋中…</div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-[rgb(var(--color-umenezumi-light))]">搵唔到符合嘅女優</div>
              )}
              {results.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pick(a)}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors"
                  style={{ color: 'rgb(var(--color-umenezumi))' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = s.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: s.avatarBg, color: s.accent }}>
                      {a.name_ja[0]}
                    </span>
                  )}
                  <span className="truncate" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{a.name_ja}</span>
                  {a.name_cn && <span className="text-xs text-[rgb(var(--color-umenezumi-light))] truncate">{a.name_cn}</span>}
                  {a.year_2026_events > 0 && (
                    <span className="ml-auto text-[10px] font-semibold shrink-0" style={{ color: 'rgb(var(--color-wine))' }}>
                      {a.year_2026_events} 場
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
