import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils.ts';
import type { LucideIcon } from 'lucide-react';
import { SkeletonText } from '@/components/ui/SkeletonText';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  colorClass?: string; // text color accent
  loading?: boolean;
  maxWidthCh?: number; // clamps value width using ch units
  titleSrOnly?: boolean; // hide title visually if needed
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  loading,
  maxWidthCh = 20,
  titleSrOnly,
  className
}) => {
  if (loading) {
    return (
      <Card className={cn(className)} aria-busy="true" aria-live="polite" role="status">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" aria-hidden="true" />
            <div className="flex-1">
              <SkeletonText lines={3} widths={[90, 70, 110]} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('hover:shadow-md transition-shadow rounded-lg', className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center">
          {Icon && <Icon className={cn('h-7 w-7 mb-2 sm:mb-0', colorClass)} />}
          <div className={cn(!Icon ? '' : 'sm:ml-4', 'w-full')}> 
            <p className={cn('text-xs font-medium text-gray-600 tracking-wide uppercase', titleSrOnly && 'sr-only')}>{title}</p>
            <p
              className={cn('text-xl sm:text-2xl font-bold break-words truncate', colorClass)}
              style={{ overflowWrap: 'anywhere', maxWidth: `${maxWidthCh}ch` }}
              title={String(value)}
            >
              {value}
            </p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
