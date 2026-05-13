'use client';

import { memo } from 'react';
import useVirtualScroll from '@/hooks/useVirtualScroll';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  overscan?: number;
  containerHeight?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
  showScrollTopButton?: boolean;
  emptyMessage?: string;
}

/**
 * 虛擬滾動列表組件
 * 高效渲染 1000+ 條數據，只渲染可視區域
 */
function VirtualListComponent<T>({
  items,
  renderItem,
  itemHeight = 120,
  overscan = 5,
  containerHeight = 600,
  className = '',
  getItemKey = (_, index) => index,
  showScrollTopButton = true,
  emptyMessage = '暫無數據',
}: VirtualListProps<T>) {
  const {
    virtualItems,
    totalHeight,
    containerProps,
    scrollToTop,
    visibleRange,
  } = useVirtualScroll({
    items,
    itemHeight,
    overscan,
    containerHeight,
    getItemKey,
  });

  // 滾動進度百分比
  const scrollProgress = totalHeight > 0 
    ? Math.round((visibleRange.end / items.length) * 100) 
    : 0;

  return (
    <div className="relative">
      {/* 虛擬滾動容器 */}
      <div
        {...containerProps}
        className={`scrollbar-thin scrollbar-thumb-nadeshiko/30 scrollbar-track-transparent hover:scrollbar-thumb-nadeshiko/50 ${className}`}
      >
        {/* 總高度佔位 - 維持滾動條正確 */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* 虛擬渲染的項目 */}
          {virtualItems.map(({ item, index, offsetTop }) => (
            <div
              key={getItemKey(item, index)}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${offsetTop}px)`,
                width: '100%',
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>

        {/* 空狀態 */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-text-secondary text-lg">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* 滾動信息條 */}
      {items.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border py-2 px-4 flex items-center justify-between text-sm">
          <span className="text-text-tertiary">
            顯示 <span className="font-semibold text-text-primary">{visibleRange.end - visibleRange.start}</span> / {items.length} 條
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-sakura-gray/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-nadeshiko-dark to-nadeshiko rounded-full transition-all duration-150"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>
              <span className="text-text-tertiary font-mono">{scrollProgress}%</span>
            </div>
            
            {showScrollTopButton && visibleRange.start > 10 && (
              <button
                onClick={() => scrollToTop()}
                className="fdb-btn fdb-btn-outline py-1.5 px-3 text-xs"
              >
                ↑ 返回頂部
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 使用 memo 避免不必要的重渲染
export const VirtualList = memo(VirtualListComponent) as typeof VirtualListComponent;
export default VirtualList;
