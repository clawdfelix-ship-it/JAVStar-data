'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';

interface SearchableItem {
  id: string;
  [key: string]: unknown;
}

interface UseSearchOptions<T extends SearchableItem> {
  data: T[];
  keys: string[];
  threshold?: number;
  location?: number;
  distance?: number;
  minMatchCharLength?: number;
  debounceMs?: number;
  historyKey?: string;
  maxHistory?: number;
}

interface SearchResult<T> {
  item: T;
  matches: {
    indices: [number, number][];
    key: string;
    value: string;
  }[];
}

/**
 * 模糊搜尋 Hook - 基於 Fuse.js
 * 支持: 模糊匹配、即時建議、搜尋歷史、高亮匹配
 */
export function useSearch<T extends SearchableItem>({
  data,
  keys,
  threshold = 0.3,
  location = 0,
  distance = 100,
  minMatchCharLength = 1,
  debounceMs = 150,
  historyKey = 'search_history',
  maxHistory = 10,
}: UseSearchOptions<T>) {
  // 搜尋狀態
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 搜尋歷史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 從 localStorage 加載搜尋歷史
  useEffect(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  }, [historyKey]);

  // 保存搜尋歷史到 localStorage
  const saveToHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setSearchHistory(prev => {
      // 移除重複 + 移到最前 + 限制數量
      const filtered = prev.filter(h => h.toLowerCase() !== searchQuery.toLowerCase());
      const newHistory = [searchQuery.trim(), ...filtered].slice(0, maxHistory);
      
      try {
        localStorage.setItem(historyKey, JSON.stringify(newHistory));
      } catch (err) {
        console.error('Failed to save search history:', err);
      }
      
      return newHistory;
    });
  }, [historyKey, maxHistory]);

  // 清除搜尋歷史
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(historyKey);
    } catch (err) {
      console.error('Failed to clear search history:', err);
    }
  }, [historyKey]);

  // 從歷史移除單項
  const removeFromHistory = useCallback((item: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(h => h !== item);
      try {
        localStorage.setItem(historyKey, JSON.stringify(newHistory));
      } catch (err) {
        console.error('Failed to remove from search history:', err);
      }
      return newHistory;
    });
  }, [historyKey]);

  // Debounce 搜尋查詢
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Fuse.js 配置
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys,
      threshold,
      location,
      distance,
      minMatchCharLength,
      includeMatches: true,
      findAllMatches: true,
      isCaseSensitive: false,
    });
  }, [data, keys, threshold, location, distance, minMatchCharLength]);

  // 執行搜尋
  const results: SearchResult<T>[] = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      return [];
    }

    const searchResults = fuse.search(debouncedQuery);
    return searchResults.map(result => ({
      item: result.item,
      matches: (result.matches || []).map(match => ({
        indices: match.indices as [number, number][],
        key: match.key || '',
        value: match.value || '',
      })),
    }));
  }, [fuse, debouncedQuery]);

  // 提取搜尋建議 (基於匹配結果)
  const suggestions = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      return [];
    }

    // 從匹配中提取建議
    const suggestionSet = new Set<string>();
    
    results.slice(0, 5).forEach(result => {
      result.matches.forEach(match => {
        if (match.value && typeof match.value === 'string') {
          suggestionSet.add(match.value);
        }
      });
    });

    return Array.from(suggestionSet).slice(0, 8);
  }, [results, debouncedQuery]);

  // 快速搜尋 (直接返回結果)
  const searchNow = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return [];
    }

    const searchResults = fuse.search(searchQuery);
    return searchResults.map(result => ({
      item: result.item,
      matches: (result.matches || []).map(match => ({
        indices: match.indices as [number, number][],
        key: match.key || '',
        value: match.value || '',
      })),
    }));
  }, [fuse]);

  // 清除搜尋
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    // 搜尋狀態
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    hasQuery: debouncedQuery.trim().length >= 2,
    
    // 搜尋結果
    results,
    resultCount: results.length,
    suggestions,
    
    // 搜尋歷史
    searchHistory,
    saveToHistory,
    clearHistory,
    removeFromHistory,
    
    // 方法
    searchNow,
    clearSearch,
  };
}

/**
 * 高亮匹配文本渲染函數
 * 使用範例: {highlightText(text, matches)}
 */
export function highlightText(
  text: string,
  matches: { indices: [number, number][] }[],
  highlightClass: string = 'bg-nadeshiko-light text-nadeshiko-dark px-0.5 rounded font-medium'
): React.ReactNode[] {
  if (!matches || matches.length === 0) {
    return [text];
  }

  // 合併所有匹配區間
  const allIndices: [number, number][] = [];
  matches.forEach(match => {
    match.indices.forEach(indices => {
      allIndices.push(indices);
    });
  });

  if (allIndices.length === 0) {
    return [text];
  }

  // 按起始位置排序
  allIndices.sort((a, b) => a[0] - b[0]);

  // 合併重疊區間
  const mergedIndices: [number, number][] = [];
  for (const indices of allIndices) {
    if (mergedIndices.length === 0) {
      mergedIndices.push(indices);
    } else {
      const last = mergedIndices[mergedIndices.length - 1];
      if (indices[0] <= last[1] + 1) {
        // 重疊或相鄰，合併
        last[1] = Math.max(last[1], indices[1]);
      } else {
        mergedIndices.push(indices);
      }
    }
  }

  // 分割文本
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mergedIndices.forEach(([start, end], i) => {
    // 非匹配部分
    if (start > lastIndex) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>);
    }
    // 匹配部分
    parts.push(
      <mark key={`highlight-${i}`} className={highlightClass}>
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  });

  // 剩餘部分
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return parts;
}

export default useSearch;
