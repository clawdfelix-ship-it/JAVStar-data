'use client';

import { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useActressSearch, type QuickActress } from '@/hooks/useActressSearch';

// 表單用女優選擇欄（2026-09-11）
// 同主場搜尋一樣走 mode=quick（trigram/假名/羅馬字/別名、debounce、IME 保護），
// 但揀中唔跳頁，純粹 callback 回傳女優，令粉絲提交直接配對到真實女優。
export interface PickedActress {
  id: string;
  name_ja: string;
  name_cn: string | null;
}

export default function ActressSelectField({
  value,
  onChange,
  required = true,
}: {
  value: PickedActress | null;
  onChange: (a: PickedActress | null) => void;
  required?: boolean;
}) {
  const { query, setQuery, results, loading, open, setOpen, onCompositionStart, onCompositionEnd } = useActressSearch();
  const [activeIdx, setActiveIdx] = useState(-1);
  const trimmed = query.trim();
  const show = open && (loading || results.length > 0 || (!!trimmed && !loading));

  function pick(a: QuickActress) {
    onChange({ id: a.id, name_ja: a.name_ja, name_cn: a.name_cn });
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
  }

  if (value) {
    return (
      <div className="mt-1 flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[rgb(var(--color-nadeshiko))] bg-[rgba(var(--color-sakura),0.3)]">
        {value.name_cn ? (
          <span className="text-sm font-medium truncate">
            <span style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{value.name_ja}</span>
            <span className="text-text-tertiary ml-1.5">{value.name_cn}</span>
          </span>
        ) : (
          <span className="text-sm font-medium truncate" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{value.name_ja}</span>
        )}
        <button type="button" onClick={clear} aria-label="清除女優"
          className="ml-auto shrink-0 text-text-tertiary hover:text-danger p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative mt-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={show}
          aria-controls="actress-pick-listbox"
          required={required}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && activeIdx >= 0 && results[activeIdx]) { e.preventDefault(); pick(results[activeIdx]); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="打女優名搜尋配對（日文/假名/羅馬字）"
          className="w-full min-h-[44px] pl-9 pr-9 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-[rgb(var(--color-nadeshiko))]"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-text-tertiary" />}
      </div>

      {show && (
        <ul id="actress-pick-listbox" role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {trimmed && !loading && results.length === 0 && (
            <li className="px-4 py-3 text-xs text-text-tertiary">搵唔到呢位女優，試日文原名／假名；呢個欄位要揀到現有女優先提交到</li>
          )}
          {results.map((a, i) => (
            <li key={a.id} role="option" aria-selected={activeIdx === i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(a)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] text-left ${activeIdx === i ? 'bg-[rgba(var(--color-nadeshiko),0.12)]' : ''}`}
              >
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" loading="lazy" />
                ) : (
                  <span className="w-8 h-8 rounded-full shrink-0 bg-[rgba(var(--color-nadeshiko-dark),0.15)] text-[rgb(var(--color-nadeshiko-dark))] font-bold flex items-center justify-center text-xs">{a.name_ja[0]}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{a.name_ja}</span>
                  {a.name_cn && <span className="block text-xs text-text-tertiary truncate">{a.name_cn}</span>}
                </span>
                {a.year_2026_events > 0 && <span className="text-[10px] font-semibold shrink-0" style={{ color: 'rgb(var(--color-wine))' }}>{a.year_2026_events} 場</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
