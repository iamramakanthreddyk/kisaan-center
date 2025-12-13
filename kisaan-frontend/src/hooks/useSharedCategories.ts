import { useState, useEffect, useCallback } from 'react';
import { categoriesApi } from '../services/api';
import type { Category } from '../types/api';

interface UseSharedCategoriesOptions {
  activeOnly?: boolean;
  enabled?: boolean;
}

interface UseSharedCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Global cache for categories
const categoriesCache = {
  data: null as Category[] | null,
  timestamp: 0,
  isLoading: false,
  error: null as string | null,
  subscribers: new Set<() => void>(),
  
  // Categories change less frequently - 10 minute TTL
  TTL: 10 * 60 * 1000,
  
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
  
  setData(data: Category[]) {
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
 * Shared categories hook that prevents duplicate API calls and caches data
 * Used across: New Transaction, Products, Category Management, Various forms
 */
export const useSharedCategories = (options: UseSharedCategoriesOptions = {}): UseSharedCategoriesReturn => {
  const { activeOnly = true, enabled = true } = options;
  
  const [state, setState] = useState({
    categories: categoriesCache.data || [],
    isLoading: categoriesCache.isLoading,
    error: categoriesCache.error
  });

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = categoriesCache.subscribe(() => {
      setState({
        categories: categoriesCache.data || [],
        isLoading: categoriesCache.isLoading,
        error: categoriesCache.error
      });
    });
    return () => { unsubscribe(); };
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!enabled) return;
    
    try {
      categoriesCache.setLoading(true);
      
      const response = activeOnly 
        ? await categoriesApi.getActive()
        : await categoriesApi.getAll();
      categoriesCache.setData(response.data || []);
    } catch (error) {
      let message = 'Failed to fetch categories';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as { message?: string }).message || message;
      }
      categoriesCache.setError(message);
    } finally {
      categoriesCache.setLoading(false);
    }
  }, [enabled, activeOnly]);

  // Load data if not cached or expired
  useEffect(() => {
    if (!enabled) return;
    if (!categoriesCache.isValid() && !categoriesCache.isLoading) {
      fetchCategories();
    }
  }, [fetchCategories, enabled]);

  return {
    categories: state.categories,
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchCategories
  };
};

/**
 * Invalidate categories cache - call this after category operations (create, update, delete)
 */
export const invalidateCategoriesCache = () => {
  categoriesCache.data = null;
  categoriesCache.timestamp = 0;
  categoriesCache.error = null;
  categoriesCache.notify();
};

/**
 * Manually update categories cache - call this after category operations with new data
 */
export const updateCategoriesCache = (categories: Category[]) => {
  categoriesCache.setData(categories);
};