import { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { ownerDashboardApi } from '../services/api';

interface DashboardStats {
  today_sales: number;
  today_transactions: number;
  today_commission: number;
  pending_collections: number;
  farmer_payments_due: number;
  buyer_payments_due: number;
  total_users: number;
  commission_realized: number;
}

export const useOwnerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    today_sales: 0,
    today_transactions: 0,
    today_commission: 0,
    pending_collections: 0,
    farmer_payments_due: 0,
    buyer_payments_due: 0,
    total_users: 0,
    commission_realized: 0
  });
  // If you have a type for transactions, use it. Otherwise, use unknown[] for now.
  const [pendingTransactions, setPendingTransactions] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
  // Fetch backend-calculated dashboard stats for owner
  const statsData = await ownerDashboardApi.getStats();
  // Basic shape guard before casting
  if (statsData && typeof statsData === 'object') {
    setStats(prev => ({
      ...prev,
      ...(statsData as Partial<DashboardStats>)
    }));
  }
      // Optionally, fetch pending transactions if needed (legacy logic)
      setPendingTransactions([]); // Or fetch if you want to show pending transactions
    } catch (err) {
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
  }, [user?.shop_id]);

  const refreshData = () => {
    fetchDashboardData();
  };

  // Optimistic transaction addition
  // Accept minimal transaction data needed to update metrics.
  // Returns a rollback function.
  const addTransactionOptimistic = (t: { quantity: number; price: number; commissionRate?: number }) => {
    const total = t.quantity * t.price;
    const commissionRate = t.commissionRate ?? 0; // If available we can pass it, else 0
    const commission = total * commissionRate;

    setStats(prev => ({
      ...prev,
      today_sales: prev.today_sales + total,
      today_transactions: prev.today_transactions + 1,
      today_commission: prev.today_commission + commission
    }));

    const rollback = () => {
      setStats(prev => ({
        ...prev,
        today_sales: prev.today_sales - total,
        today_transactions: Math.max(0, prev.today_transactions - 1),
        today_commission: prev.today_commission - commission
      }));
    };
    return rollback;
  };

  return {
    stats,
    pendingTransactions,
    isLoading,
    error,
    refreshData,
    addTransactionOptimistic
  };
};