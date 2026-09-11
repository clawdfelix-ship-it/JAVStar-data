'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Clock, TrendingUp } from 'lucide-react';
import { useActressSearch, type QuickActress } from '@/hooks/useActressSearch';

// 正統女優 typeahead（Phase 1 搜尋藍圖 2026-09-10）
// 規格：combobox、↑↓ Enter Esc、44px 觸控、spinner/空/失敗三態、歷史、avatar、活動數、睇全部結果
export default function ActressSearchBox({
  variant = 'hero',
  autoFocus = false,
}: {
  variant?: 'hero' | 'page';
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const {
    query, setQuery, results, loading, failed,
    open, setOpen, history, hot, loadHot, pushHistory, clearHistory, removeHistoryItem,
    onCompositionStart, onCompositionEnd,
  } = useActressSearch();

  const [activeIdx, setActiveIdx] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const trimmed = query.trim();
  const showDropdown = open && (loading || results.length > 0 || failed || (!!trimmed && !loading) || (!trimmed && (history.length > 0 || hot.length > 0)));

  // 可選項：有查詢時 = 結果 + 「睇全部」；空查詢 focus = 歷史 + 熱門
  const optionCount = trimmed ? results.length + 1 : history.length + hot.length;

  useEffect(() => {
    setActiveIdx(-1);
  }, [query, results]);

  const commitTerm = useCallback((term: string) => {
    pushHistory(term);
    setQuery(term);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }, [pushHistory, router, setQuery, setOpen]);

  const pickActress = useCallback((a: QuickActress) => {
    pushHistory(query.trim() || a.name_ja);
    setOpen(false);
    router.push(`/actress/${a.id}`);
  }, [pushHistory, query, router, setOpen]);

  const hotStart = history.length;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (trimmed && activeIdx >= 0 && activeIdx < results.length) {
        e.preventDefault();
        pickActress(results[activeIdx]);
      } else if (trimmed) {
        e.preventDefault();
        commitTerm(trimmed);
      } else if (activeIdx >= 0) {
        // 空查詢：歷史（前面）> 熱門（後面）
        e.preventDefault();
        if (activeIdx < history.length) commitTerm(history[activeIdx]);
        else {
          const hotIdx = activeIdx - history.length;
          if (hot[hotIdx]) pickActress(hot[hotIdx]);
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const inputCls = variant === 'hero'
    ? 'w-full pl-12 pr-12 py-4 text-lg bg-white border-2 rounded-2xl shadow-froala border-nadeshiko ring-4 ring-nadeshiko-light/30 placeholder:text-text-tertiary'
    : 'w-full pl-11 pr-10 py-3 text-base bg-white border-2 border-border rounded-xl focus:border-nadeshiko focus:ring-4 focus:ring-nadeshiko-light/30 focus:outline-none transition placeholder:text-text-tertiary';

  return (
    <div className="relative w-full">
      <div className="relative">
        <span className={`absolute inset-y-0 left-0 ${variant === 'hero' ? 'pl-4' : 'pl-3.5'} flex items-center pointer-events-none text-text-tertiary`}>
          <Search className={variant === 'hero' ? 'w-5 h-5' : 'w-4.5 h-4.5'} />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="actress-search-listbox"
          aria-activedescendant={activeIdx >= 0 ? `actress-opt-${activeIdx}` : undefined}
          placeholder="搜尋女優名、假名、羅馬字…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); loadHot(); }}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 140); }}
          onKeyDown={onKeyDown}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          className={inputCls}
        />
        {loading ? (
          <span className={`absolute inset-y-0 right-0 ${variant === 'hero' ? 'pr-4' : 'pr-3.5'} flex items-center text-text-tertiary`}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </span>
        ) : query ? (
          <button
            type="button"
            aria-label="清除搜尋"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className={`absolute inset-y-0 right-0 ${variant === 'hero' ? 'pr-4' : 'pr-3.5'} flex items-center text-text-tertiary hover:text-nadeshiko-dark active:scale-90 transition`}
          >
            <X className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <ul
          id="actress-search-listbox"
          role="listbox"
          className="absolute z-50 mt-2 w-full bg-white border border-border rounded-2xl shadow-xl overflow-hidden text-left max-h-[22rem] overflow-y-auto"
        >
          {/* 空查詢 + 歷史 */}
          {!trimmed && history.length > 0 && (
            <>
              <li className="flex items-center justify-between px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 最近搜尋</span>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearHistory} className="normal-case tracking-normal text-text-tertiary hover:text-nadeshiko-dark">
                  清除
                </button>
              </li>
              {history.map((h, i) => (
                <li key={h} role="option" aria-selected={activeIdx === i} id={`actress-opt-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => commitTerm(h)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-left ${activeIdx === i ? 'bg-[rgba(var(--color-nadeshiko),0.12)]' : ''}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    <span className="flex-1 truncate">{h}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`刪除 ${h}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.stopPropagation(); removeHistoryItem(h); }}
                      className="text-text-tertiary hover:text-nadeshiko-dark px-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </>
          )}

          {/* 空查詢 + 熱門女優 */}
          {!trimmed && hot.length > 0 && (
            <>
              <li className="flex items-center gap-1 px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                <TrendingUp className="w-3 h-3" /> 熱門女優
              </li>
              {hot.map((a, i) => {
                const idx = hotStart + i;
                return (
                  <li key={`hot-${a.id}`} role="option" aria-selected={activeIdx === idx} id={`actress-opt-${idx}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => pickActress(a)}
                      className={`w-full flex items-center gap-3 px-4 py-2 min-h-[44px] text-left ${activeIdx === idx ? 'bg-[rgba(var(--color-nadeshiko),0.12)]' : ''}`}
                    >
                      {a.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 bg-[rgba(var(--color-sakura-gray),0.4)]" loading="lazy" />
                      ) : (
                        <span className="w-8 h-8 rounded-full shrink-0 bg-[rgba(var(--color-nadeshiko-dark),0.15)] text-[rgb(var(--color-nadeshiko-dark))] font-bold flex items-center justify-center text-xs">{a.name_ja[0]}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-text-primary truncate" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{a.name_ja}</span>
                        {a.name_cn && <span className="block text-xs text-text-tertiary truncate">{a.name_cn}</span>}
                      </span>
                      <span className="text-[10px] font-semibold text-text-tertiary shrink-0">No.{i + 1}</span>
                    </button>
                  </li>
                );
              })}
            </>
          )}

          {/* 查詢結果 */}
          {trimmed && results.map((a, i) => (
            <li key={a.id} role="option" aria-selected={activeIdx === i} id={`actress-opt-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pickActress(a)}
                className={`w-full flex items-center gap-3 px-4 py-2 min-h-[48px] text-left ${activeIdx === i ? 'bg-[rgba(var(--color-nadeshiko),0.12)]' : ''}`}
              >
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 bg-[rgba(var(--color-sakura-gray),0.4)]" loading="lazy" />
                ) : (
                  <span className="w-9 h-9 rounded-full shrink-0 bg-[rgba(var(--color-nadeshiko-dark),0.15)] text-[rgb(var(--color-nadeshiko-dark))] font-bold flex items-center justify-center text-sm">{a.name_ja[0]}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-primary truncate" style={{ fontFamily: 'Noto Sans JP, sans-serif' }}>{a.name_ja}</span>
                  {a.name_cn && <span className="block text-xs text-text-tertiary truncate">{a.name_cn}</span>}
                </span>
                {a.year_2026_events > 0 && (
                  <span className="text-[11px] text-[rgb(var(--color-wine))] font-semibold shrink-0">{a.year_2026_events} 場</span>
                )}
              </button>
            </li>
          ))}

          {/* 狀態列 */}
          {trimmed && loading && results.length === 0 && (
            <li className="px-4 py-4 text-sm text-text-tertiary">搜尋中…</li>
          )}
          {trimmed && !loading && results.length === 0 && !failed && (
            <li className="px-4 py-5 text-center">
              <p className="text-sm text-text-secondary">搵唔到「{trimmed}」相關女優</p>
              <p className="text-xs text-text-tertiary mt-1">試下日文原名、假名或羅馬字</p>
            </li>
          )}
          {trimmed && failed && (
            <li className="px-4 py-4 text-sm text-danger">搜尋失敗，請檢查網絡後重試</li>
          )}

          {/* 睇全部結果 */}
          {trimmed && !failed && (
            <li role="option" aria-selected={activeIdx === results.length} id={`actress-opt-${results.length}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIdx(results.length)}
                onClick={() => commitTerm(trimmed)}
                className={`w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold text-[rgb(var(--color-wine))] border-t border-border ${activeIdx === results.length ? 'bg-[rgba(var(--color-nadeshiko),0.12)]' : ''}`}
              >
                <TrendingUp className="w-4 h-4" />
                睇晒「{trimmed}」嘅全部結果
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
