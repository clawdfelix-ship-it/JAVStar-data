'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, Ticket, Loader2, FileText } from 'lucide-react';
import useSearch, { highlightText } from '@/hooks/useSearch';

interface SearchBarProps<T extends { id: string }> {
  data: T[];
  searchKeys: string[];
  placeholder?: string;
  onSelect?: (item: T) => void;
  onSearch?: (query: string, results: T[]) => void;
  renderSuggestion?: (item: T, query: string) => React.ReactNode;
  className?: string;
  showHistory?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
  historyKey?: string;
}

/**
 * 智慧搜尋欄組件
 * 功能: 模糊搜尋、即時建議、搜尋歷史、高亮匹配、快捷鍵
 */
export function SearchBar<T extends { id: string; name_ja?: string; title?: string }>({
  data,
  searchKeys,
  placeholder = '搜尋...',
  onSelect,
  onSearch,
  renderSuggestion,
  className = '',
  showHistory = true,
  showSuggestions = true,
  maxSuggestions = 8,
  debounceMs = 150,
  historyKey = 'search_history',
}: SearchBarProps<T>) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 使用搜尋 Hook
  const search = useSearch({
    data,
    keys: searchKeys,
    debounceMs,
    historyKey,
    maxHistory: 10,
  });

  // 點擊外部關閉下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 鍵盤導航
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const totalItems = Math.max(
        search.results.length,
        search.searchHistory.length
      );

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < totalItems - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0) {
            // 選擇建議
            if (search.results[selectedIndex]) {
              handleSelect(search.results[selectedIndex].item);
            } else if (search.searchHistory[selectedIndex]) {
              // 選擇歷史
              search.setQuery(search.searchHistory[selectedIndex]);
            }
          } else if (search.query.trim()) {
            // 執行搜尋
            search.saveToHistory(search.query);
            onSearch?.(search.query, search.results.map(r => r.item));
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsFocused(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    if (isFocused) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, selectedIndex, search]);

  // 選擇搜尋結果
  const handleSelect = (item: T) => {
    search.saveToHistory(search.query);
    onSelect?.(item);
    search.clearSearch();
    setIsFocused(false);
    setSelectedIndex(-1);
  };

  // 點擊歷史
  const handleHistoryClick = (historyItem: string) => {
    search.setQuery(historyItem);
    inputRef.current?.focus();
  };

  // 顯示下拉
  const showDropdown = isFocused && (
    search.hasQuery ||
    (showHistory && search.searchHistory.length > 0)
  );

  return (
    <div className={`relative w-full ${className}`}>
      {/* 搜尋輸入框 - Froala Design Blocks style */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {search.isSearching ? (
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-text-tertiary" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="fdb-input pl-12 pr-10 py-3 w-full text-base"
        />

        {/* 清除按鈕 */}
        {search.query && (
          <button
            onClick={() => search.clearSearch()}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="清除搜尋"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 下拉菜單 */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-border overflow-hidden z-50"
        >
          {/* 搜尋結果 */}
          {search.hasQuery && search.results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              <div className="px-4 py-2 bg-bg-secondary border-b border-border">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  搜尋結果 ({search.resultCount})
                </span>
              </div>
              
              {search.results.slice(0, maxSuggestions).map((result, index) => (
                <button
                  key={result.item.id}
                  onClick={() => handleSelect(result.item)}
                  className={`w-full px-4 py-3 text-left hover:bg-nadeshiko-light/20 transition-colors flex items-center gap-3 ${
                    selectedIndex === index ? 'bg-nadeshiko-light/20' : ''
                  }`}
                >
                  {renderSuggestion ? (
                    renderSuggestion(result.item, search.debouncedQuery)
                  ) : (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[rgba(var(--color-nadeshiko),0.3)] to-[rgba(var(--color-nadeshiko-dark),0.2)] flex items-center justify-center shrink-0">
                        <Ticket className="w-4 h-4 text-[rgb(var(--color-nadeshiko-dark))]" />
                      </div>
                      <span className="text-text-primary font-medium truncate">
                        {highlightText(
                          result.item.name_ja || result.item.title || result.item.id,
                          result.matches
                        )}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 無結果提示 */}
          {search.hasQuery && search.results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Search className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-text-secondary text-sm">
                搵唔到「<span className="text-[rgb(var(--color-nadeshiko-dark))] font-medium">{search.query}</span>」相關結果
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                試吓用其他關鍵字或者簡化搜尋條件
              </p>
            </div>
          )}

          {/* 搜尋歷史 */}
          {showHistory && !search.hasQuery && search.searchHistory.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  最近搜尋
                </span>
                <button
                  onClick={() => search.clearHistory()}
                  className="text-xs text-nadeshiko-dark hover:text-nadeshiko transition-colors"
                >
                  清除全部
                </button>
              </div>
              
              {search.searchHistory.map((item, index) => (
                <div
                  key={item}
                  className={`px-4 py-2 flex items-center justify-between group hover:bg-nadeshiko-light/10 transition-colors ${
                    selectedIndex === index + search.results.length ? 'bg-nadeshiko-light/20' : ''
                  }`}
                >
                  <button
                    onClick={() => handleHistoryClick(item)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Clock className="w-4 h-4 text-text-tertiary shrink-0" />
                    <span className="text-text-secondary group-hover:text-text-primary transition-colors">
                      {item}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      search.removeFromHistory(item);
                    }}
                    className="text-text-tertiary hover:text-danger opacity-0 group-hover:opacity-100 transition-all p-1"
                    aria-label="移除搜尋歷史"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 快捷鍵提示 */}
          <div className="px-4 py-2 bg-bg-secondary border-t border-border flex items-center justify-between text-xs text-text-tertiary">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-xs">↑↓</kbd>
                {' '}選擇
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-xs">Enter</kbd>
                {' '}確認
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-xs">Esc</kbd>
                {' '}關閉
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
