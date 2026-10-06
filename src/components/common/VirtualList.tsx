import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number | string;
  estimateItemHeight?: number;
  overscan?: number;
  className?: string;
  emptyState?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  renderItem,
  height = '500px',
  estimateItemHeight = 64,
  overscan = 5,
  className = '',
  emptyState,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateItemHeight,
    overscan,
  });

  if (items.length === 0 && emptyState) {
    return <div className={`p-8 text-center ${className}`}>{emptyState}</div>;
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      style={{ height, overflowY: 'auto' }}
      className={`relative w-full custom-scrollbar ${className}`}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualList;
