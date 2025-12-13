import { apiClient } from '../services/apiClient';
import type { Shop } from '../types/api';

/**
 * Utility function to find a shop by owner ID with proper type handling
 */
export const findShopByOwnerId = (shops: Shop[], ownerId: string | number): Shop | null => {
  if (!Array.isArray(shops) || !ownerId) return null;
  return shops.find((shop: Shop) => {
    // Handle type mismatches between string and number IDs
    return shop.owner_id === ownerId || 
           shop.owner_id === Number(ownerId) || 
           Number(shop.owner_id) === Number(ownerId);
  }) || null;
};

/**
 * Fetch shop data for a specific owner
 */
/**
 * Fetch shop for a given owner. If the user has shop_id, fetch directly by id. Otherwise, fallback to /shops?owner_id=ID or filter from all shops.
 */
export const fetchOwnerShop = async (ownerId: string | number, shopId?: string | number): Promise<Shop | null> => {
  try {
    if (shopId) {
      // If shopId is known, fetch directly
      const response = await apiClient.get<{ data?: Shop }>(`/shops/${shopId}`);
      return response?.data ?? null;
    }
    // Try /shops?owner_id=ID (if backend supports it)
    try {
      const response = await apiClient.get<{ shops?: Shop[]; data?: Shop[] }>(`/shops?owner_id=${ownerId}`);
      const shops: Shop[] = Array.isArray(response?.shops)
        ? response.shops
        : Array.isArray(response?.data)
          ? response.data
          : [];
      if (shops.length > 0) return shops[0];
    } catch {
      // Ignore error, fallback logic will handle
    }
    // Fallback: fetch all and filter
    const response = await apiClient.get<{ data?: Shop[]; shops?: Shop[] }>('/shops');
    const allShops: Shop[] = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.shops)
        ? response.shops
        : [];
    return findShopByOwnerId(allShops, ownerId);
  } catch (error) {
    console.error('Error fetching owner shop:', error);
    throw error;
  }
};