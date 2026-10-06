import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualTableBodyProps<T> {
  items: T[];
  colSpan: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  estimateRowHeight?: number;
  overscan?: number;
  emptyState?: React.ReactNode;
}

export function VirtualTableBody<T>({
  items,
  colSpan,
  renderRow,
  scrollRef,
  estimateRowHeight = 48,
  overscan = 8,
  emptyState,
}: VirtualTableBodyProps<T>) {
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  if (items.length === 0) {
    return emptyState ? (
      <tbody>
        <tr>
          <td colSpan={colSpan} className="text-center py-8">
            {emptyState}
          </td>
        </tr>
      </tbody>
    ) : null;
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? totalSize)
      : 0;

  return (
    <tbody className="divide-y divide-slate-100 bg-white">
      {paddingTop > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: `${paddingTop}px`, padding: 0, border: 'none' }} />
        </tr>
      )}
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        return (
          <React.Fragment key={virtualRow.key}>
            {renderRow(item, virtualRow.index)}
          </React.Fragment>
        );
      })}
      {paddingBottom > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: `${paddingBottom}px`, padding: 0, border: 'none' }} />
        </tr>
      )}
    </tbody>
  );
}

export default VirtualTableBody;
