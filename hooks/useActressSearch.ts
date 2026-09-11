'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Phase 1 搜尋藍圖（2026-09-10）：typeahead 專用 hook
// - debounce 200ms
// - CJK ≥1 字元 / Latin ≥2 字元先查（單一拉丁字母會炸出 1/5 全表）
// - IME composition：中日文輸入法未確定候選詞時唔查
// - AbortController + 遞增 seq：遲返嘅舊 response 一律丟棄（防競態）
// - localStorage 搜尋歷史（最多 6 條）

const HISTORY_KEY = 'jstar_search_history';
const HISTORY_MAX = 6;

export interface QuickActress {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  year_2026_events: number;
}

function hasCjk(s: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(s);
}

/** 可唔可以開查詢 */
export function isQueryEligible(q: string) {
  const kw = q.trim();
  if (!kw) return false;
  if (hasCjk(kw)) return kw.length >= 1;
  return kw.length >= 2;
}

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

export function useActressSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickActress[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  // 空 focus 時顯示「熱門女優」（ranking 頭 5，lazy 載入一次；藍圖 3.5）
  const [hot, setHot] = useState<QuickActress[]>([]);
  const hotLoadedRef = useRef(false);

  const composingRef = useRef(false);
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setHistory(loadHistory()), []);

  const loadHot = useCallback(() => {
    if (hotLoadedRef.current) return;
    hotLoadedRef.current = true;
    fetch('/api/actresses?limit=5')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setHot(Array.isArray(d.data) ? d.data.slice(0, 5) : []))
      .catch(() => {
        // 失敗可以重試
        hotLoadedRef.current = false;
      });
  }, []);

  const pushHistory = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, HISTORY_MAX);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* private mode 等，唔阻塞 */
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* noop */
    }
    setHistory([]);
  }, []);

  const removeHistoryItem = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== term);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  // debounce + IME + abort + seq
  useEffect(() => {
    if (composingRef.current) return;
    if (!isQueryEligible(query)) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    setFailed(false);

    const seq = ++seqRef.current;
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetch(`/api/actresses?mode=quick&search=${encodeURIComponent(query.trim())}&limit=9`, {
        signal: ctrl.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => {
          if (seq !== seqRef.current) return; // 舊結果，丟棄
          setResults(d.data || []);
          setFailed(false);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          if (seq !== seqRef.current) return;
          setFailed(true);
        })
        .finally(() => {
          if (seq === seqRef.current) setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false;
    // 候選詞確定後，靠 setQuery 觸發 effect；若值沒變則手動 bump
    // （React onChange 喺 compositionend 後一定再 fire，呢度保險）
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    failed,
    open,
    setOpen,
    history,
    hot,
    loadHot,
    pushHistory,
    clearHistory,
    removeHistoryItem,
    onCompositionStart,
    onCompositionEnd,
  };
}
