/**
 * Custom hooks for API data fetching
 * Using React Query for caching and state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import type { 
  User, 
  Shop, 
  Product, 
  Transaction, 
  Payment, 
  Credit, 
  PaginatedResponse
} from '@/types';

// Query keys for caching
export const QUERY_KEYS = {
  USERS: ['users'] as const,
  SHOPS: ['shops'] as const,
  PRODUCTS: ['products'] as const,
  TRANSACTIONS: ['transactions'] as const,
  PAYMENTS: ['payments'] as const,
  CREDITS: ['credits'] as const,
  FARMER_STOCK: ['farmer-stock'] as const,
  DASHBOARD: ['dashboard'] as const,
} as const;

// Generic hook for GET requests
export function useApiQuery<T>(
  key: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const { isAuthenticated } = useAuth();
  
  return useQuery<T>({
    queryKey: key,
    queryFn: () => apiClient.get<T>(url),
    enabled: isAuthenticated,
    ...options,
  });
}

// Generic hook for mutations
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context, action) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries();
      options?.onSuccess?.(data, variables, context, action);
    },
    ...options,
  });
}

// User management hooks
export function useUsers() {
  return useApiQuery<PaginatedResponse<User>>(
    [...QUERY_KEYS.USERS],
    '/users'
  );
}

export function useUser(id: string) {
  return useApiQuery<User>(
    [...QUERY_KEYS.USERS, id],
    `/users/${id}`,
    {
      enabled: !!id,
    }
  );
}

export function useCreateUser() {
  return useApiMutation(
    (userData: Partial<User>) => apiClient.post<User>('/users', userData)
  );
}

export function useUpdateUser() {
  return useApiMutation(
    ({ id, ...userData }: { id: string } & Partial<User>) =>
      apiClient.put<User>(`/users/${id}`, userData)
  );
}

export function useDeleteUser() {
  return useApiMutation(
    (id: string) => apiClient.delete(`/users/${id}`)
  );
}

// Shop management hooks
export function useShops() {
  return useApiQuery<PaginatedResponse<Shop>>(
    QUERY_KEYS.SHOPS,
    '/shops'
  );
}

export function useShop(id: string) {
  return useApiQuery<Shop>(
    [...QUERY_KEYS.SHOPS, id],
    `/shops/${id}`,
    {
      enabled: !!id,
    }
  );
}

export function useCreateShop() {
  return useApiMutation(
    (shopData: Partial<Shop>) => apiClient.post<Shop>('/shops', shopData)
  );
}

// Product management hooks
export function useProducts(shopId?: string) {
  const params = shopId ? `?shop_id=${shopId}` : '';
  
  return useApiQuery<PaginatedResponse<Product>>(
    [...QUERY_KEYS.PRODUCTS, shopId],
    `/products${params}`
  );
}

export function useProduct(id: string) {
  return useApiQuery<Product>(
    [...QUERY_KEYS.PRODUCTS, id],
    `/products/${id}`,
    {
      enabled: !!id,
    }
  );
}

export function useCreateProduct() {
  return useApiMutation(
    (productData: Partial<Product>) => apiClient.post<Product>('/products', productData)
  );
}

// Transaction management hooks
export function useTransactions() {
  return useApiQuery<PaginatedResponse<Transaction>>(
    [...QUERY_KEYS.TRANSACTIONS],
    '/transactions'
  );
}

export function useTransaction(id: string) {
  return useApiQuery<Transaction>(
    [...QUERY_KEYS.TRANSACTIONS, id],
    `/transactions/${id}`,
    {
      enabled: !!id,
    }
  );
}

export function useCreateTransaction() {
  return useApiMutation(
    (transactionData: Partial<Transaction>) => 
      apiClient.post<Transaction>('/transactions', transactionData)
  );
}

export function useUpdateTransaction() {
  return useApiMutation(
    ({ id, ...transactionData }: { id: string } & Partial<Transaction>) =>
      apiClient.put<Transaction>(`/transactions/${id}`, transactionData)
  );
}

// Payment management hooks
export function usePayments() {
  return useApiQuery<PaginatedResponse<Payment>>(
    QUERY_KEYS.PAYMENTS,
    '/payments'
  );
}

export function useCreatePayment() {
  return useApiMutation(
    (paymentData: Partial<Payment>) => apiClient.post<Payment>('/payments', paymentData)
  );
}

// Credit management hooks
export function useCredits(userId?: string) {
  const params = userId ? `?user_id=${userId}` : '';
  
  return useApiQuery<PaginatedResponse<Credit>>(
    [...QUERY_KEYS.CREDITS, userId],
    `/credits${params}`
  );
}

// Stock management hooks
// FarmerStock hooks removed (type does not exist)

// Dashboard hooks
export function useDashboard(role: string, userId?: string) {
  const endpoint = role === 'OWNER' ? '/owner-dashboard/dashboard' :
                  role === 'FARMER' ? '/farmer/dashboard' :
                  role === 'BUYER' ? '/buyer/dashboard' :
                  role === 'EMPLOYEE' ? '/employee/dashboard' :
                  '/dashboard';
  
  return useApiQuery<unknown>(
    [...QUERY_KEYS.DASHBOARD, role, userId],
    endpoint
  );
}

// =================== GLOBAL USER MAPPING HOOK ===================

/**
 * Global hook for mapping user IDs to user data and names
 * Provides utilities to resolve user information across the application
 */
export function useUserMap() {
  const { data: usersResponse, ...usersQuery } = useUsers();
  const users = usersResponse?.data || [];

  // Create a map of user ID to user object for fast lookups
  const userMap = useMemo(() => {
    const map = new Map<string | number, User>();
    users.forEach(user => {
      map.set(user.id, user);
      map.set(String(user.id), user); // Also store string version for flexibility
    });
    return map;
  }, [users]);

  // Utility functions for getting user information
  const getUserById = useCallback((id: string | number): User | undefined => {
    return userMap.get(id) || userMap.get(String(id));
  }, [userMap]);

  const getUserName = useCallback((id: string | number): string => {
    const user = getUserById(id);
    return user?.username || user?.firstname || 'Unknown User';
  }, [getUserById]);

  const getUserFullName = useCallback((id: string | number): string => {
    const user = getUserById(id);
    if (!user) return 'Unknown User';
    
    const firstName = user.firstname || '';
    const username = user.username;
    
    if (firstName && username) {
      return `${firstName} (${username})`;
    }
    return firstName || username || 'Unknown User';
  }, [getUserById]);

  const getUserDisplayName = useCallback((id: string | number): string => {
    const user = getUserById(id);
    return user?.firstname || user?.username || 'Unknown';
  }, [getUserById]);

  return {
    // Raw data
    users,
    userMap,
    
    // Query state
    ...usersQuery,
    
    // Utility functions
    getUserById,
    getUserName,
    getUserFullName,
    getUserDisplayName,
    
    // Convenience getters
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
  };
}