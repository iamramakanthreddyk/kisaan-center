import { apiClient } from './apiClient';


export const shopCategoryApi = {
  // Get categories assigned to a shop (returns array of Category)
  getCategoriesForShop: async (shopId: number) => {
    const resp: any = await apiClient.get(`/shop-categories/shop/${shopId}/categories`);
    // If API returns array directly
    if (Array.isArray(resp)) return resp;
    // If API returns { data: [...] }
    if (resp && Array.isArray(resp.data)) return resp.data;
    return [];
  },
  // Optionally: get the first (primary) category for a shop
  getPrimaryCategoryId: async (shopId: number) => {
    const categories = await shopCategoryApi.getCategoriesForShop(shopId);
    return categories.length > 0 ? categories[0].id : undefined;
  }
};
