import { Request, Response } from 'express';
import { success, failureCode } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { parseId } from '../shared/utils/parse';
import sequelize from '../config/database';

/**
 * Get products for transaction with priority:
 * 1. If farmer has specific products assigned, show those first
 * 2. Show shop's assigned products
 * 3. Fallback to products from shop's categories (if not already assigned to shop)
 */
export const getTransactionProducts = async (req: Request, res: Response) => {
  try {
    const shopId = parseId(req.params.shopId, 'shop id');
    const farmerId = req.query.farmerId ? parseId(req.query.farmerId as string, 'farmer id') : null;

  let products: unknown[] = [];
    
    // Priority 1: Farmer-specific products (if farmer is specified and has assignments)
    if (farmerId) {
      try {
        const [farmerProducts] = await sequelize.query(`
          SELECT DISTINCT p.*, c.name as category_name, 'farmer-specific' as source
          FROM kisaan_products p
          LEFT JOIN kisaan_categories c ON p.category_id = c.id
          INNER JOIN farmer_product_assignments fpa ON p.id = fpa.product_id
          WHERE fpa.farmer_id = :farmerId AND fpa.is_active = true
          ORDER BY p.name
        `, { replacements: { farmerId } });
        
        if (Array.isArray(farmerProducts) && farmerProducts.length > 0) {
          products = farmerProducts;
        }
      } catch (error: unknown) {
        // Table might not exist, continue to next priority
        req.log?.debug({ err: error }, 'farmer_product_assignments table not found, continuing...');
      }
    }

    // Priority 2: Shop-assigned products (if no farmer-specific products found)
    if (products.length === 0) {
      const [shopProducts] = await sequelize.query(`
        SELECT DISTINCT p.*, c.name as category_name, 'shop-assigned' as source
        FROM kisaan_products p
        LEFT JOIN kisaan_categories c ON p.category_id = c.id
        INNER JOIN kisaan_shop_products sp ON p.id = sp.product_id
        WHERE sp.shop_id = :shopId AND sp.is_active = true
        ORDER BY p.name
      `, { replacements: { shopId } });

      if (Array.isArray(shopProducts) && shopProducts.length > 0) {
        products = shopProducts;
      }
    }

    // Priority 3: Products from shop's categories (fallback)
    if (products.length === 0) {
      const [categoryProducts] = await sequelize.query(`
        SELECT DISTINCT p.*, c.name as category_name, 'category-fallback' as source
        FROM kisaan_products p
        LEFT JOIN kisaan_categories c ON p.category_id = c.id
        WHERE p.category_id IN (
          SELECT sc.category_id 
          FROM kisaan_shop_categories sc 
          WHERE sc.shop_id = :shopId AND sc.is_active = true
        )
        ORDER BY p.name
      `, { replacements: { shopId } });

      if (Array.isArray(categoryProducts) && categoryProducts.length > 0) {
        products = categoryProducts;
      }
    }

    // Final fallback: All products if shop has no categories assigned
    if (products.length === 0) {
      const [allProducts] = await sequelize.query(`
        SELECT p.*, c.name as category_name, 'all-products-fallback' as source
        FROM kisaan_products p
        LEFT JOIN kisaan_categories c ON p.category_id = c.id
        WHERE p.record_status = 'active'
        ORDER BY c.name, p.name
      `);

      if (Array.isArray(allProducts)) {
        products = allProducts;
      }
    }

    let source: string = 'none';
    if (products.length > 0 && typeof products[0] === 'object' && products[0] !== null && 'source' in products[0]) {
      source = String((products[0] as { source?: unknown }).source ?? 'none');
    }
    return success(res, products, {
      message: `Products loaded for transaction (source: ${source})`,
      meta: {
        count: products.length,
        source,
        shopId,
        farmerId
      }
    });

  } catch (error: unknown) {
    req.log?.error({ err: error }, 'getTransactionProducts failed');
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
    return failureCode(res, 500, ErrorCodes.GET_PRODUCTS_FAILED, undefined, 
      message || 'Failed to fetch transaction products');
  }
};

/**
 * Get products available for owner to assign to their shop
 * Shows only products from categories assigned to the shop
 */
export const getOwnerAssignableProducts = async (req: Request, res: Response) => {
  try {
    const shopId = parseId(req.params.shopId, 'shop id');
  const user = (req as Request & { user?: { id?: number; shop_id?: number } }).user;
  const _userId = user?.id;
  const userShopId = user?.shop_id;

    // Ensure owner can only access their own shop
    if (userShopId !== shopId) {
      return failureCode(res, 403, ErrorCodes.ACCESS_DENIED, 
        { requestedShop: shopId, userShop: userShopId }, 
        'You can only manage products for your own shop');
    }

    // Get products from shop's assigned categories that aren't already assigned to the shop
    const [products] = await sequelize.query(`
      SELECT DISTINCT p.*, c.name as category_name
      FROM kisaan_products p
      LEFT JOIN kisaan_categories c ON p.category_id = c.id
      WHERE p.category_id IN (
        SELECT sc.category_id 
        FROM kisaan_shop_categories sc 
        WHERE sc.shop_id = :shopId AND sc.is_active = true
      )
      AND p.id NOT IN (
        SELECT sp.product_id 
        FROM kisaan_shop_products sp 
        WHERE sp.shop_id = :shopId AND sp.is_active = true
      )
      AND p.record_status = 'active'
      ORDER BY c.name, p.name
    `, { replacements: { shopId } });

    return success(res, Array.isArray(products) ? products : [], {
      message: 'Products available for assignment to your shop',
      meta: {
        count: Array.isArray(products) ? products.length : 0,
        shopId,
        filteredByCategories: true
      }
    });

  } catch (error: unknown) {
    req.log?.error({ err: error }, 'getOwnerAssignableProducts failed');
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
    return failureCode(res, 500, ErrorCodes.GET_PRODUCTS_FAILED, undefined, 
      message || 'Failed to fetch assignable products');
  }
};
