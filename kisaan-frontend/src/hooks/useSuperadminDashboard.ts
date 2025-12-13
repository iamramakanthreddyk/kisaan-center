import { useState, useEffect } from 'react';
import type { Shop } from '../types/api';
import { superadminDashboardApi } from '../services/api';

interface SuperadminStats {
  total_shops: number;
  total_owners: number;
  total_users: number;
  total_revenue: number;
  active_shops: number;
  pending_settlements: number;
}

export const useSuperadminDashboard = () => {
  const [stats, setStats] = useState<SuperadminStats>({
    total_shops: 0,
    total_owners: 0,
    total_users: 0,
    total_revenue: 0,
    active_shops: 0,
    pending_settlements: 0
  });
  const [recentShops, setRecentShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the dedicated superadmin dashboard endpoint
      const dashboardDataRaw = await superadminDashboardApi.getDashboard();
      // Fetch recent shops separately
      try {
        const recentShopsData = await superadminDashboardApi.getRecentShops();
        setRecentShops(recentShopsData);
      } catch (shopError) {
        console.warn('Failed to fetch recent shops:', shopError);
        setRecentShops([]);
      }

      // Type guard for dashboardData
      let calculatedStats: SuperadminStats = {
        total_shops: 0,
        total_owners: 0,
        total_users: 0,
        total_revenue: 0,
        active_shops: 0,
        pending_settlements: 0
      };
      if (
        dashboardDataRaw && typeof dashboardDataRaw === 'object' && 'data' in dashboardDataRaw &&
        dashboardDataRaw.data && typeof dashboardDataRaw.data === 'object' &&
        'metrics' in dashboardDataRaw.data &&
        dashboardDataRaw.data.metrics && typeof dashboardDataRaw.data.metrics === 'object' &&
        'charts' in dashboardDataRaw.data &&
        dashboardDataRaw.data.charts && typeof dashboardDataRaw.data.charts === 'object' &&
        'userStats' in dashboardDataRaw.data.charts &&
        Array.isArray(dashboardDataRaw.data.charts.userStats)
      ) {
        const metrics = dashboardDataRaw.data.metrics as Record<string, unknown>;
        const userStatsArr = dashboardDataRaw.data.charts.userStats as Array<{ role: string; count: number }>;
        calculatedStats = {
          total_shops: Number(metrics.totalShops) || 0,
          total_users: Number(metrics.totalUsers) || 0,
          total_owners: userStatsArr.find((u) => u.role === 'owner')?.count || 0,
          total_revenue: Number(metrics.totalRevenue) || 0,
          active_shops: Number(metrics.activeShops) || 0,
          pending_settlements: Number(metrics.totalCommission) || 0
        };
      }
      setStats(calculatedStats);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      let message = 'Failed to load dashboard data';
      if (err && typeof err === 'object' && 'message' in err) {
        message = (err as { message?: string }).message || message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    stats,
    recentShops,
    isLoading,
    error,
    refreshData
  };
};