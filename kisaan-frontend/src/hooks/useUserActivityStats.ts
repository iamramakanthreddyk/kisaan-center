import { useState, useEffect } from 'react';
import { superadminDashboardApi } from '../services/api';
import type { UserActivityStats } from '../types/api';

export const useUserActivityStats = () => {
  const [activityStats, setActivityStats] = useState<UserActivityStats>({
    recentLogins: [],
    activeSessions: 0,
    usersWithMultipleSessions: [],
    loginActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await superadminDashboardApi.getActivityStats();
      if (response.data) {
        setActivityStats(response.data);
      } else {
        setError('No activity data received');
      }
    } catch (err) {
      console.error('Failed to fetch user activity stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityStats();
  }, []);

  return {
    activityStats,
    isLoading,
    error,
    refreshData: fetchActivityStats
  };
};