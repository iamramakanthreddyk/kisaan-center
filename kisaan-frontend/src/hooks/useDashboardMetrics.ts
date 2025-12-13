import { useMemo } from 'react';
import { formatCurrency, formatNumber } from '@/utils/format';
import { colors } from '@/config/designTokens';

export interface RawDashboardStats {
  today_sales?: number;
  today_transactions?: number;
  today_commission?: number;
  buyer_payments_due?: number;
  farmer_payments_due?: number;
  total_users?: number;
  commission_realized?: number;
}

export interface MetricDescriptor {
  key: string;
  label: string;
  value: string; // formatted
  raw: number;  // underlying numeric for potential sorting/logic
  subtitle?: string;
  colorClass?: string;
}

export interface UseDashboardMetricsResult {
  metrics: MetricDescriptor[];
  summary: {
    totalSales: number;
    totalTransactions: number;
    totalOutstanding: number; // buyers due + farmers due (optional aggregated perspective)
  };
}

/**
 * Central hook to map raw dashboard stats into formatted metric descriptors.
 * Keeps formatting logic isolated and ready for future derived metrics (e.g., avg sale value).
 */
export function useDashboardMetrics(raw: RawDashboardStats | null | undefined): UseDashboardMetricsResult {
  return useMemo(() => {
    const todaySales = raw?.today_sales ?? 0;
    const todayTransactions = raw?.today_transactions ?? 0;
    const buyerDue = raw?.buyer_payments_due ?? 0;
    const farmerDue = raw?.farmer_payments_due ?? 0;

    const metrics: MetricDescriptor[] = [
      {
        key: 'today-sales',
        label: "Today's Sales",
        value: formatCurrency(todaySales),
        raw: todaySales,
        subtitle: `${formatNumber(todayTransactions, { maximumFractionDigits: 0 })} transactions`,
        colorClass: colors.metricBlue
      },
      {
        key: 'to-collect',
        label: 'To Collect',
        value: formatCurrency(buyerDue),
        raw: buyerDue,
        subtitle: 'From buyers',
        colorClass: colors.metricOrange
      },
      {
        key: 'to-pay',
        label: 'To Pay',
        value: formatCurrency(farmerDue),
        raw: farmerDue,
        subtitle: 'To farmers',
        colorClass: colors.metricRed
      }
    ];

    return {
      metrics,
      summary: {
        totalSales: todaySales,
        totalTransactions: todayTransactions,
        totalOutstanding: buyerDue + farmerDue,
      }
    };
  }, [raw]);
}
