import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

interface Entity { id: number; username?: string; name?: string; }

interface UseTransactionFormDataResult {
  farmers: Entity[];
  buyers: Entity[];
  products: Entity[];
  categories: Entity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactionFormData(): UseTransactionFormDataResult {
  console.log('useTransactionFormData hook mounted');
  const [farmers, setFarmers] = useState<Entity[]>([]);
  const [buyers, setBuyers] = useState<Entity[]>([]);
  const [products, setProducts] = useState<Entity[]>([]);
  const [categories, setCategories] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (farmers.length > 0) {
      console.log('Farmers loaded:', farmers);
    }
    if (buyers.length > 0) {
      console.log('Buyers loaded:', buyers);
    }
    if (products.length > 0) {
      console.log('Products loaded:', products);
    }
    if (categories.length > 0) {
      console.log('Categories loaded:', categories);
    }
  }, [farmers, buyers, products, categories]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      setError('Data loading timed out. Please refresh the page.');
      setIsLoading(false);
    }, 8000); // 8 seconds timeout
    console.log('fetchAll called');
    try {
      console.log('Starting fetch...');
      const [farmersResRaw, buyersResRaw, productsResRaw, categoriesResRaw] = await Promise.all([
        apiClient.get('/users?role=farmer') as unknown,
        apiClient.get('/users?role=buyer') as unknown,
        apiClient.get('/products') as unknown,
        apiClient.get('/categories') as unknown,
      ]);
      // Type guards for API responses
      const farmersRes = (typeof farmersResRaw === 'object' && farmersResRaw && 'data' in farmersResRaw) ? (farmersResRaw as { data?: Entity[] }) : { data: [] };
      const buyersRes = (typeof buyersResRaw === 'object' && buyersResRaw && 'data' in buyersResRaw) ? (buyersResRaw as { data?: Entity[] }) : { data: [] };
      const productsRes = (typeof productsResRaw === 'object' && productsResRaw && 'data' in productsResRaw) ? (productsResRaw as { data?: Entity[] }) : { data: [] };
      const categoriesRes = (typeof categoriesResRaw === 'object' && categoriesResRaw && 'data' in categoriesResRaw) ? (categoriesResRaw as { data?: Entity[] }) : { data: [] };
      console.log('Fetch completed');
      if (!didTimeout) {
        // Log raw API responses for debugging
        console.log('RAW farmersRes:', farmersRes);
        console.log('RAW buyersRes:', buyersRes);
        console.log('RAW productsRes:', productsRes);
        console.log('RAW categoriesRes:', categoriesRes);

  setFarmers(Array.isArray(farmersRes?.data) ? farmersRes.data : []);
  setBuyers(Array.isArray(buyersRes?.data) ? buyersRes.data : []);
  setProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
  setCategories(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
      }
    } catch (e) {
      console.log('Error in fetchAll:', e);
      let message = 'Failed to load form data';
      if (e && typeof e === 'object' && 'message' in e) {
        message = (e as { message?: string }).message || message;
      }
      if (!didTimeout) {
        setError(message);
      }
    } finally {
      if (!didTimeout) {
        setIsLoading(false);
      }
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { farmers, buyers, products, categories, isLoading, error, refetch: fetchAll };
}

export default useTransactionFormData;
