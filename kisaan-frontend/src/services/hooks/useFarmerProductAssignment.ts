import { useState, useCallback } from 'react';
import { shopProductsApi, farmerProductApi } from '../api';
// ShopProductMapped type matches the mapped return from getShopProducts
type ShopProductMapped = {
  id: number;
  shop_id: number;
  product_id: number;
  product_name: string;
  category?: { id: number; name: string };
  category_name?: string;
  is_active?: boolean;
  category_id?: number;
  record_status?: string;
};


export function useFarmerProductAssignment(shopId?: number, farmerId?: number, onAssigned?: () => void) {
  const [shopProducts, setShopProducts] = useState<ShopProductMapped[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch only assignable products for the farmer (active shop products not assigned to farmer)
  const fetchProductsForFarmer = useCallback(async (farmerIdParam?: number) => {
    if (!shopId || !farmerIdParam) return;
    try {
      // New API: returns only assignable products
      const assignable = await shopProductsApi.getAssignableProducts(shopId, farmerIdParam);
      setShopProducts(assignable);
      setSelectedProductIds([]);
    } catch {
      setShopProducts([]);
      setSelectedProductIds([]);
    }
  }, [shopId]);

  const handleAssignProducts = useCallback(async (farmerIdParam?: number, productIds: number[] = []) => {
    if (!farmerIdParam || productIds.length === 0) return;
    setAssignLoading(true);
    try {
      for (const pid of productIds) {
        await farmerProductApi.assignProduct(farmerIdParam, pid);
      }
      if (onAssigned) onAssigned();
    } catch {
      alert('Failed to assign products');
    } finally {
      setAssignLoading(false);
    }
  }, [onAssigned]);

  return {
    shopProducts,
    selectedProductIds,
    setSelectedProductIds,
    assignLoading,
    fetchProductsForFarmer,
    handleAssignProducts
  };
}
