'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualScrollOptions<T> {
  items: T[];
  itemHeight?: number;
  overscan?: number;
  containerHeight?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

interface UseVirtualScrollResult<T> {
  virtualItems: {
    item: T;
    index: number;
    key: string | number;
    offsetTop: number;
  }[];
  totalHeight: number;
  containerProps: {
    ref: (el: HTMLDivElement | null) => void;
    style: {
      height: string;
      overflow: 'auto';
      position: 'relative';
    };
    onScroll: () => void;
  };
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  visibleRange: { start: number; end: number };
}

/**
 * 虛擬滾動 Hook - 高效渲染大量列表數據
 * 只渲染可視區域內的元素，大幅減少 DOM 節點
 */
export function useVirtualScroll<T>({
  items,
  itemHeight = 120, // 默認卡片高度
  overscan = 5, // 上下預渲染數量
  containerHeight = 600, // 默認容器高度
  getItemKey = (_, index) => index,
}: UseVirtualScrollOptions<T>): UseVirtualScrollResult<T> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 計算可視範圍
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    return { start: startIndex, end: endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 生成虛擬渲染的項目
  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      result.push({
        item: items[i],
        index: i,
        key: getItemKey(items[i], i),
        offsetTop: i * itemHeight,
      });
    }
    return result;
  }, [visibleRange, items, itemHeight, getItemKey]);

  // 總高度
  const totalHeight = items.length * itemHeight;

  // 滾動事件處理 (防抖)
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  // 設置容器 ref
  const setRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (el) {
      setScrollTop(el.scrollTop);
    }
  }, []);

  // 滾動到指定索引
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return;
    const targetScrollTop = Math.max(0, index * itemHeight - overscan * itemHeight);
    containerRef.current.scrollTo({ top: targetScrollTop, behavior });
  }, [itemHeight, overscan]);

  // 滾動到頂部
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({ top: 0, behavior });
  }, []);

  // 滾動到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({ top: totalHeight, behavior });
  }, [totalHeight]);

  // 容器 props
  const containerProps = {
    ref: setRef,
    style: {
      height: `${containerHeight}px`,
      overflow: 'auto' as const,
      position: 'relative' as const,
    },
    onScroll: handleScroll,
  };

  return {
    virtualItems,
    totalHeight,
    containerProps,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    visibleRange,
  };
}

export default useVirtualScroll;
