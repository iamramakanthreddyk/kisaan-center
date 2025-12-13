import React from 'react';
import { AlertCircle, Users, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

interface DashboardStatsProps {
  stats: {
    today_sales: number;
    today_transactions: number;
    today_commission: number;
    buyer_payments_due: number;
    farmer_payments_due: number;
    total_users: number;
    commission_realized?: number;
  };
  isLoading?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, isLoading }) => {
  const { metrics } = useDashboardMetrics(stats);
  const iconMap: Record<string, LucideIcon> = {
    'today-sales': Calendar,
    'to-collect': AlertCircle,
    'to-pay': Users
  };

  return (
    <div role="group" aria-label="Today's metrics" aria-busy={isLoading ? 'true' : 'false'}>
      <ResponsiveGrid className="w-full" minColWidth="10.5rem" gap="gap-3 sm:gap-5">
        {metrics.map(card => (
          <MetricCard
            key={card.key}
            title={card.label}
            value={card.value}
            subtitle={card.subtitle}
            icon={iconMap[card.key]}
            colorClass={card.colorClass}
            loading={isLoading}
            maxWidthCh={20}
          />
        ))}
      </ResponsiveGrid>
    </div>
  );
};