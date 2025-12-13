import type { Category } from '../types/api';
// Global cache for categories (per session)
let categoriesCache: Category[] | null = null;

export function useCategoriesCache() {
  const getCategories = () => categoriesCache;
  const setCategoriesCache = (categories: Category[]) => {
    categoriesCache = categories;
  };
  return { getCategories, setCategoriesCache };
}
