import React, { Key, ReactNode, memo, useMemo } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

export type VirtualizedListProps<T> = {
  items: T[];
  height: number; // container height in px
  itemSize: number; // row height in px
  width?: number | string;
  overscanCount?: number;
  getItemKey?: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
};

function InnerRow<T>({ index, style, data }: ListChildComponentProps<{ items: T[]; renderItem: (item: T, idx: number) => ReactNode }>) {
  const item = data.items[index];
  return (
    <div style={style} className="virtualized-row">
      {data.renderItem(item, index)}
    </div>
  );
}

function VirtualizedListInner<T>({ items, height, itemSize, width = '100%', overscanCount = 6, getItemKey, renderItem, className }: VirtualizedListProps<T>) {
  // Stable itemKey function for react-window
  const itemKey = useMemo(() => {
    if (getItemKey) {
      return (index: number, data: { items: T[] }) => getItemKey(data.items[index], index);
    }
    return (index: number) => index;
  }, [getItemKey]);

  const itemData = useMemo(() => ({ items, renderItem }), [items, renderItem]);

  return (
    <FixedSizeList
      className={className}
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={itemSize}
      overscanCount={overscanCount}
      itemKey={itemKey as any}
      itemData={itemData}
    >
      {InnerRow as any}
    </FixedSizeList>
  );
}

export const VirtualizedList = memo(VirtualizedListInner) as unknown as <T>(props: VirtualizedListProps<T>) => React.ReactElement;
export default VirtualizedList;
