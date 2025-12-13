import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types/api';

interface UseSharedUsersOptions {
  roles?: string[];
  shop_id?: number;
  enabled?: boolean;
}

interface UseSharedUsersReturn {
  users: User[];
  farmers: User[];
  buyers: User[];
  employees: User[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Global cache to prevent duplicate API calls
const usersCache = {
  data: null as User[] | null,
  timestamp: 0,
  isLoading: false,
  error: null as string | null,
  subscribers: new Set<() => void>(),
  
  // Cache TTL: 5 minutes
  TTL: 5 * 60 * 1000,
  
  isValid(): boolean {
    return this.data !== null && (Date.now() - this.timestamp) < this.TTL;
  },
  
  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  },
  
  notify() {
    this.subscribers.forEach(callback => callback());
  },
  
  setData(data: User[]) {
    this.data = data;
    this.timestamp = Date.now();
    this.error = null;
    this.isLoading = false;
    this.notify();
  },
  
  setError(error: string) {
    this.error = error;
    this.isLoading = false;
    this.notify();
  },
  
  setLoading(loading: boolean) {
    this.isLoading = loading;
    if (loading) this.error = null;
    this.notify();
  }
};

/**
 * Shared users hook that prevents duplicate API calls and caches data
 * Used across: New Transaction, Transaction Management, User Management, Reports
 */
export const useSharedUsers = (options: UseSharedUsersOptions = {}): UseSharedUsersReturn => {
  const { user: currentUser } = useAuth();
  const { roles, shop_id = currentUser?.shop_id, enabled = true } = options;
  
  const [state, setState] = useState({
    users: usersCache.data || [],
    isLoading: usersCache.isLoading,
    error: usersCache.error
  });

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = usersCache.subscribe(() => {
      setState({
        users: usersCache.data || [],
        isLoading: usersCache.isLoading,
        error: usersCache.error
      });
    });
    return () => { unsubscribe(); };
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!enabled) return;
    try {
      usersCache.setLoading(true);
      const params: Record<string, unknown> = { limit: 100 };
      if (shop_id) params.shop_id = shop_id;
      if (roles?.length) params.role = roles.join(',');
      const response = await usersApi.getAll(params);
      usersCache.setData(response.data || []);
    } catch (error) {
      let message = 'Failed to fetch users';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as { message?: string }).message || message;
      }
      usersCache.setError(message);
    } finally {
      usersCache.setLoading(false);
    }
  }, [enabled, shop_id, roles]);

  // Load data if not cached or expired
  useEffect(() => {
    if (!enabled) return;
    if (!usersCache.isValid() && !usersCache.isLoading) {
      fetchUsers();
    }
  }, [fetchUsers, enabled]);

  // Filter users by role
  const farmers = state.users.filter(u => u.role === 'farmer');
  const buyers = state.users.filter(u => u.role === 'buyer');
  const employees = state.users.filter(u => u.role && ['employee', 'owner'].includes(u.role));

  return {
    users: state.users,
    farmers,
    buyers,
    employees,
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchUsers
  };
};

/**
 * Hook specifically for farmers - commonly used in transaction forms
 */
export const useSharedFarmers = () => {
  return useSharedUsers({ roles: ['farmer'] });
};

/**
 * Hook specifically for buyers - commonly used in transaction forms
 */
export const useSharedBuyers = () => {
  return useSharedUsers({ roles: ['buyer'] });
};

/**
 * Invalidate users cache - call this after user operations (create, update, delete)
 */
export const invalidateUsersCache = () => {
  usersCache.data = null;
  usersCache.timestamp = 0;
  usersCache.error = null;
  usersCache.notify();
};

/**
 * Manually update users cache - call this after user operations with new data
 */
export const updateUsersCache = (users: User[]) => {
  usersCache.setData(users);
};