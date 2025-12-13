/**
 * Centralized Shop Data Management Hooks
 * Using React Query for automatic caching, sharing, and invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, transactionsApi, paymentsApi, ownerDashboardApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';
import type { User, Transaction } from '@/types/api';

// Query Keys for consistent caching
export const SHOP_QUERY_KEYS = {
  users: (shopId: string) => ['shop', shopId, 'users'] as const,
  transactions: (shopId: string, filters?: Record<string, unknown>) => 
    ['shop', shopId, 'transactions', filters] as const,
  payments: (shopId: string) => ['shop', shopId, 'payments'] as const,
  balance: (shopId: string) => ['shop', shopId, 'balance'] as const,
  dashboardStats: (shopId: string) => ['shop', shopId, 'dashboard'] as const,
} as const;

// =================== CENTRALIZED USER DATA ===================

/**
 * Centralized Shop Users Hook - Replaces all individual usersApi.getAll() calls
 * Used by: TransactionManagement, BalanceManagement, PaymentManagement, etc.
 */
export function useShopUsers(shopId?: string | number) {
  const { user } = useAuth();
  const actualShopId = shopId || user?.shop_id;
  
  return useQuery({
    queryKey: SHOP_QUERY_KEYS.users(String(actualShopId)),
    queryFn: async () => {
      const response = await usersApi.getAll({ shop_id: Number(actualShopId), limit: 200 });
      return response.data || [];
    },
    enabled: !!actualShopId,
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes in cache (v5 uses gcTime instead of cacheTime)
    select: (data: User[]) => data.filter((u: User) => ['farmer', 'buyer', 'employee'].includes(u.role)),
  });
}

/**
 * Get users filtered by role - uses cached data from useShopUsers
 */
export function useShopUsersByRole(role: 'farmer' | 'buyer' | 'employee', shopId?: string | number) {
  const { data: allUsers = [], ...query } = useShopUsers(shopId);
  
  const filteredUsers = useMemo(() => 
    (allUsers as User[]).filter((user: User) => user.role === role),
    [allUsers, role]
  );
  
  return {
    data: filteredUsers,
    ...query
  };
}

// =================== CENTRALIZED TRANSACTION DATA ===================

/**
 * Centralized Shop Transactions Hook with automatic user enrichment
 */
export function useShopTransactions(shopId?: string | number, filters?: Record<string, unknown>) {
  const { user } = useAuth();
  const actualShopId = shopId || user?.shop_id;
  
  // Get users first (will use cache if available)
  const { data: users = [] } = useShopUsers(actualShopId);
  
  const transactionQuery = useQuery({
    queryKey: SHOP_QUERY_KEYS.transactions(String(actualShopId), filters),
    queryFn: async () => {
      const params = {
        shop_id: actualShopId ? Number(actualShopId) : undefined,
        ...filters,
      };
      const response = await transactionsApi.getAll(params);
      return response.data || [];
    },
    enabled: !!actualShopId,
    staleTime: 2 * 60 * 1000, // 2 minutes - transactions change more frequently
  });
  
  // Enrich transactions with user data from cache
  const enrichedTransactions = useMemo(() => {
    const usersArray = users as User[];
    if (!transactionQuery.data || !usersArray.length) return [];
    
    return transactionQuery.data.map((txn: Transaction) => ({
      ...txn,
      buyer_name: usersArray.find((u: User) => String(u.id) === String(txn.buyer_id))?.username || 'Unknown',
      farmer_name: usersArray.find((u: User) => String(u.id) === String(txn.farmer_id))?.username || 'Unknown',
      buyer_firstname: usersArray.find((u: User) => String(u.id) === String(txn.buyer_id))?.firstname,
      farmer_firstname: usersArray.find((u: User) => String(u.id) === String(txn.farmer_id))?.firstname,
    }));
  }, [transactionQuery.data, users]);
  
  return {
    ...transactionQuery,
    data: enrichedTransactions,
    users, // Include users for backward compatibility
  };
}

// =================== CENTRALIZED PAYMENT DATA ===================

/**
 * Centralized Shop Payments Hook
 */
export function useShopPayments(shopId?: string | number) {
  const { user } = useAuth();
  const actualShopId = shopId || user?.shop_id;
  
  return useQuery({
    queryKey: SHOP_QUERY_KEYS.payments(String(actualShopId)),
    queryFn: async () => {
      // Get all payments and filter by shop if needed
      const response = await paymentsApi.getAll({});
      return response.data || [];
    },
    enabled: !!actualShopId,
    staleTime: 1 * 60 * 1000, // 1 minute - payments change frequently
  });
}

// =================== CENTRALIZED DASHBOARD DATA ===================

/**
 * Centralized Owner Dashboard Stats - Replaces duplicate dashboard calls
 */
export function useOwnerDashboardStats(shopId?: string | number) {
  const { user } = useAuth();
  const actualShopId = shopId || user?.shop_id;
  
  return useQuery({
    queryKey: SHOP_QUERY_KEYS.dashboardStats(String(actualShopId)),
    queryFn: async () => {
      const response = await ownerDashboardApi.getStats();
      return response;
    },
    enabled: !!actualShopId && user?.role === 'owner',
    staleTime: 30 * 1000, // 30 seconds - dashboard needs to be fresh
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

// =================== MUTATION HOOKS WITH INVALIDATION ===================

/**
 * Create User Mutation with automatic cache invalidation
 */
export function useCreateUser(shopId?: string | number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const targetShopId = shopId || user?.shop_id;
  
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      // Invalidate users cache for this shop
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.users(String(targetShopId))
      });
      
      // Also invalidate transactions since they show user names
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'shop' && 
          query.queryKey[1] === String(targetShopId) &&
          query.queryKey[2] === 'transactions'
      });
    },
  });
}

/**
 * Update User Mutation with automatic cache invalidation
 */
export function useUpdateUser(shopId?: string | number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const targetShopId = shopId || user?.shop_id;
  
  return useMutation({
    mutationFn: ({ id, ...userData }: { id: string } & Partial<User>) =>
      usersApi.update(id, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.users(String(targetShopId))
      });
      
      // Invalidate transactions to update user names
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'shop' && 
          query.queryKey[1] === String(targetShopId) &&
          query.queryKey[2] === 'transactions'
      });
    },
  });
}

/**
 * Create Transaction Mutation with automatic cache invalidation
 */
export function useCreateTransaction(shopId?: string | number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const targetShopId = shopId || user?.shop_id;
  
  return useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      // Invalidate all transaction queries for this shop
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'shop' && 
          query.queryKey[1] === String(targetShopId) &&
          query.queryKey[2] === 'transactions'
      });
      
      // Invalidate dashboard stats
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.dashboardStats(String(targetShopId))
      });
      
      // Invalidate payments
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.payments(String(targetShopId))
      });
    },
  });
}

// =================== DATA INVALIDATION UTILITIES ===================

/**
 * Hook for manual data invalidation
 */
export function useDataInvalidation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return {
    invalidateShopData: (shopId?: string) => {
      const targetShopId = shopId || user?.shop_id;
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'shop' && 
          query.queryKey[1] === String(targetShopId)
      });
    },
    
    invalidateUsers: (shopId?: string) => {
      const targetShopId = shopId || user?.shop_id;
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.users(String(targetShopId))
      });
    },
    
    invalidateTransactions: (shopId?: string) => {
      const targetShopId = shopId || user?.shop_id;
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey[0] === 'shop' && 
          query.queryKey[1] === String(targetShopId) &&
          query.queryKey[2] === 'transactions'
      });
    },
    
    invalidateDashboard: (shopId?: string) => {
      const targetShopId = shopId || user?.shop_id;
      queryClient.invalidateQueries({
        queryKey: SHOP_QUERY_KEYS.dashboardStats(String(targetShopId))
      });
    }
  };
}

// =================== LEGACY COMPATIBILITY ===================

/**
 * Drop-in replacement for the old useOwnerDashboard hook
 */
export function useOwnerDashboard() {
  const { data: stats, isLoading, error, refetch } = useOwnerDashboardStats();
  
  return {
    stats: stats || {
      today_sales: 0,
      today_transactions: 0,
      today_commission: 0,
      pending_collections: 0,
      farmer_payments_due: 0,
      buyer_payments_due: 0,
      total_users: 0,
      commission_realized: 0
    },
    isLoading,
    error: error?.message || null,
    refreshData: refetch,
  };
}