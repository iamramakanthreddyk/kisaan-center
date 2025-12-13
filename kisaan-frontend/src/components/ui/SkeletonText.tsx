import React from 'react';
import clsx from 'clsx';

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  widths?: (string | number)[]; // e.g. ['60%', 80]
  animate?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  className,
  widths,
  animate = true
}) => {
  const arr = Array.from({ length: lines });
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {arr.map((_, i) => {
        const width = widths?.[i];
        const style: React.CSSProperties = width
          ? { width: typeof width === 'number' ? `${width}px` : width }
          : {};
        return (
          <div
            key={i}
            className={clsx('h-3 rounded bg-gray-200', animate && 'animate-pulse')}
            style={style}
          />
        );
      })}
    </div>
  );
};

export default SkeletonText;
