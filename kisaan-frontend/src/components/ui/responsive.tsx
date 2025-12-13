import React from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface ResponsivePageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive page wrapper that adjusts padding and spacing for mobile vs desktop
 */
export function ResponsivePage({ children, className = '' }: ResponsivePageProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 sm:space-y-6 ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Responsive page header with title, subtitle, and actions
 */
export function ResponsiveHeader({ title, subtitle, actions, className = '' }: ResponsiveHeaderProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 ${className}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 text-sm sm:text-base">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

interface ResponsiveCardGridProps {
  children: React.ReactNode;
  mobileColumns?: 1 | 2;
  desktopColumns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Responsive grid for cards that adapts column count based on screen size
 */
export function ResponsiveCardGrid({ 
  children, 
  mobileColumns = 1, 
  desktopColumns = 3,
  className = '' 
}: ResponsiveCardGridProps) {
  const gridCols = {
    mobile: mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2',
    desktop: `sm:grid-cols-${desktopColumns}`
  };
  
  return (
    <div className={`grid ${gridCols.mobile} ${gridCols.desktop} gap-4 ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveTableProps {
  table: React.ReactNode;
  mobileCards: React.ReactNode;
  className?: string;
}

/**
 * Shows table on desktop and cards on mobile
 */
export function ResponsiveTable({ table, mobileCards, className = '' }: ResponsiveTableProps) {
  return (
    <div className={className}>
      {/* Mobile Cards */}
      <div className="block md:hidden">
        {mobileCards}
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block">
        {table}
      </div>
    </div>
  );
}