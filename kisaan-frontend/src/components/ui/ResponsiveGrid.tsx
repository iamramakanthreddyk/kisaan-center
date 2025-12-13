import React from 'react';
import clsx from 'clsx';

/**
 * ResponsiveGrid
 * Mobile-first auto-fit grid with sensible gaps.
 * Props:
 *  - minColWidth: min width before wrapping (default 12rem)
 *  - as: semantic element (div/section/ul)
 */
export interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  minColWidth?: string; // e.g. '10rem'
  as?: keyof JSX.IntrinsicElements;
  gap?: string; // tailwind gap classes override
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  minColWidth = '11.5rem',
  as: Component = 'div',
  gap,
}) => {
  // Use CSS grid auto-fit with a fallback for older browsers (not critical now)
  const style: React.CSSProperties = {
    gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}, 1fr))`
  };

  return (
    <Component
      className={clsx(
        'grid',
        gap || 'gap-3 sm:gap-4',
        'items-stretch content-start',
        className
      )}
      style={style}
    >
      {children}
    </Component>
  );
};

export default ResponsiveGrid;
