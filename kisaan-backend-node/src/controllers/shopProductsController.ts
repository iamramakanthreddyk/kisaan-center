import { Request, Response } from 'express';
import { Product } from '../models/product';
import { ShopProducts } from '../models/shopProducts';
import sequelize from '../config/database';
import { success, failureCode, created } from '../shared/http/respond';
import { ErrorCodes } from '../shared/errors/errorCodes';
import { parseId } from '../shared/utils/parse';
// Assign a product to a shop
interface SequelizeOriginalError {
  code?: string;
  constraint?: string;
  [key: string]: unknown;
}

interface SequelizeErrorLike extends Error {
  original?: SequelizeOriginalError;
  status?: number;
  [key: string]: unknown;
}

function hasOriginal(err: unknown): err is SequelizeErrorLike {
  return typeof err === 'object' && err !== null && 'original' in err && typeof (err as Record<string, unknown>).original === 'object';
}

export const assignProductToShop = async (req: Request, res: Response) => {
  try {
    // Authorization is handled by requireShopAccess middleware
    const { shopId, productId } = req.params;
    const shop_id = parseId(shopId, 'shop id');
    const product_id = parseId(productId, 'product id');

    // Quick existence checks to avoid raw FK violation bubbling up
    const product = await Product.findByPk(product_id);
    if (!product) {
      return failureCode(res, 404, ErrorCodes.PRODUCT_NOT_FOUND, undefined, 'Product not found');
    }
    // NOTE: If there is a Shop model we could verify shop existence similarly.

    const [mapping, wasCreated] = await ShopProducts.findOrCreate({
      where: { shop_id, product_id },
      defaults: { shop_id, product_id, is_active: true },
    });
    if (!wasCreated && !mapping.is_active) {
      mapping.is_active = true;
      await mapping.save();
    }
    return created(res, mapping, { message: 'Product assigned to shop' });
  } catch (error: unknown) {
    // Translate FK violations if they somehow still occur
    let pgCode: string | undefined = undefined;
    let constraint: string | undefined = undefined;
    if (hasOriginal(error)) {
      pgCode = error.original?.code;
      constraint = error.original?.constraint;
    }
    if (pgCode === '23503') {
      if (constraint && /product_id/i.test(constraint)) {
        return failureCode(res, 404, ErrorCodes.PRODUCT_NOT_FOUND, { constraint }, 'Product not found');
      }
      if (constraint && /shop_id/i.test(constraint)) {
        return failureCode(res, 404, ErrorCodes.SHOP_NOT_FOUND, { constraint }, 'Shop not found');
      }
      return failureCode(res, 400, ErrorCodes.ASSIGN_PRODUCT_FAILED, { constraint }, 'Invalid foreign key reference');
    }
    req.log?.error({ err: error }, 'shopProducts:assign failed');
    let message: string | undefined = undefined;
    let status: number | undefined = undefined;
    if (typeof error === 'object' && error) {
      if ('message' in error) {
        message = (error as { message?: string }).message;
      }
      if ('status' in error) {
        status = (error as { status?: number }).status;
      }
    }
    if (status) {
      return failureCode(res, status, ErrorCodes.ASSIGN_PRODUCT_FAILED, undefined, message);
    }
    return failureCode(res, 500, ErrorCodes.ASSIGN_PRODUCT_FAILED, undefined, message || 'Failed to assign product');
  }
};

// Remove a product from a shop
export const removeProductFromShop = async (req: Request, res: Response) => {
  try {
    const { shopId, productId } = req.params;
    const shop_id = parseId(shopId, 'shop id');
    const product_id = parseId(productId, 'product id');
    const mapping = await ShopProducts.findOne({ where: { shop_id, product_id } });
    if (!mapping) {
      return failureCode(res, 404, ErrorCodes.PRODUCT_MAPPING_NOT_FOUND, undefined, 'Mapping not found');
    }
    await mapping.destroy();
    return success(res, { shop_id, product_id }, { message: 'Product removed from shop' });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'shopProducts:remove failed');
    let message: string | undefined = undefined;
    let status: number | undefined = undefined;
    if (typeof error === 'object' && error) {
      if ('message' in error) {
        message = (error as { message?: string }).message;
      }
      if ('status' in error) {
        status = (error as { status?: number }).status;
      }
    }
    if (status) {
      return failureCode(res, status, ErrorCodes.REMOVE_PRODUCT_FAILED, undefined, message);
    }
    return failureCode(res, 500, ErrorCodes.REMOVE_PRODUCT_FAILED, undefined, message || 'Failed to remove product');
  }
};

// Toggle product active status for a shop
export const toggleProductActiveStatus = async (req: Request, res: Response) => {
  try {
    const { shopId, productId } = req.params;
    const shop_id = parseId(shopId, 'shop id');
    const product_id = parseId(productId, 'product id');
    const mapping = await ShopProducts.findOne({ where: { shop_id, product_id } });
    if (!mapping) {
      return failureCode(res, 404, ErrorCodes.PRODUCT_MAPPING_NOT_FOUND, undefined, 'Mapping not found');
    }
    mapping.is_active = !mapping.is_active;
    await mapping.save();
    return success(res, mapping, { message: 'Product active status toggled' });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'shopProducts:toggle failed');
    let message: string | undefined = undefined;
    let status: number | undefined = undefined;
    if (typeof error === 'object' && error) {
      if ('message' in error) {
        message = (error as { message?: string }).message;
      }
      if ('status' in error) {
        status = (error as { status?: number }).status;
      }
    }
    if (status) {
      return failureCode(res, status, ErrorCodes.TOGGLE_PRODUCT_STATUS_FAILED, undefined, message);
    }
    return failureCode(res, 500, ErrorCodes.TOGGLE_PRODUCT_STATUS_FAILED, undefined, message || 'Failed to toggle status');
  }
};

// Get all products assigned to a shop (via shop_products mapping table)
export const getShopProducts = async (req: Request, res: Response) => {
  try {
    const shopIdParam = req.params.id;
    const shopId = parseId(shopIdParam, 'shop id');
    // Use json_object for SQLite, json_build_object for Postgres
    const dbDialect = (sequelize.getDialect && sequelize.getDialect()) || process.env.DB_DIALECT || 'postgres';
    const jsonObjectFn = dbDialect === 'sqlite' ? "json_object('id', c.id, 'name', c.name)" : "json_build_object('id', c.id, 'name', c.name)";
    const query = `SELECT p.*, sp.is_active as is_active, c.name as category_name, ${jsonObjectFn} as category
      FROM kisaan_products p
      INNER JOIN kisaan_shop_products sp ON p.id = sp.product_id
      LEFT JOIN kisaan_categories c ON p.category_id = c.id
      WHERE sp.shop_id = :shopId AND sp.is_active = true
      ORDER BY p.name`;
    const [results] = await sequelize.query(query, { replacements: { shopId } });
    return success(res, Array.isArray(results) ? results : [], { message: 'Shop products retrieved', meta: { count: Array.isArray(results) ? results.length : 0 } });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'shopProducts:list failed');
    let message: string | undefined = undefined;
    let status: number | undefined = undefined;
    if (typeof error === 'object' && error) {
      if ('message' in error) {
        message = (error as { message?: string }).message;
      }
      if ('status' in error) {
        status = (error as { status?: number }).status;
      }
    }
    if (status) {
      return failureCode(res, status, ErrorCodes.GET_SHOP_PRODUCTS_FAILED, undefined, message);
    }
    return failureCode(res, 500, ErrorCodes.GET_SHOP_PRODUCTS_FAILED, undefined, message || 'Failed to fetch shop products');
  }
};

// Get all available products for a shop (filtered by shop's categories)
export const getAvailableProductsForShop = async (req: Request, res: Response) => {
  try {
    const shopIdParam = req.params.id;
    const shopId = parseId(shopIdParam, 'shop id');
    const [categoryCheck] = await sequelize.query(
      `SELECT COUNT(*) as category_count
       FROM kisaan_shop_categories sc 
       WHERE sc.shop_id = :shopId AND sc.is_active = true`,
      { replacements: { shopId } }
    );
    const hasCategoriesAssigned = Array.isArray(categoryCheck) &&
      categoryCheck.length > 0 &&
      typeof (categoryCheck[0] as { category_count?: number | string }).category_count !== 'undefined' &&
      Number((categoryCheck[0] as { category_count?: number | string }).category_count) > 0;
    let query: string;
    if (hasCategoriesAssigned) {
      query = `SELECT p.*, c.name as category_name
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
               ORDER BY c.name, p.name`;
    } else {
      query = `SELECT p.*, c.name as category_name
               FROM kisaan_products p
               LEFT JOIN kisaan_categories c ON p.category_id = c.id
               WHERE p.id NOT IN (
                 SELECT sp.product_id 
                 FROM kisaan_shop_products sp 
                 WHERE sp.shop_id = :shopId AND sp.is_active = true
               )
               ORDER BY c.name, p.name`;
    }
    const [results] = await sequelize.query(query, { replacements: { shopId } });
    return success(res, Array.isArray(results) ? results : [], { message: hasCategoriesAssigned ? 'Products filtered by shop categories' : 'No categories assigned to shop - showing all available products', meta: { count: Array.isArray(results) ? results.length : 0, filteredByCategories: hasCategoriesAssigned } });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'shopProducts:available failed');
    let message: string | undefined = undefined;
    let status: number | undefined = undefined;
    if (typeof error === 'object' && error) {
      if ('message' in error) {
        message = (error as { message?: string }).message;
      }
      if ('status' in error) {
        status = (error as { status?: number }).status;
      }
    }
    if (status) {
      return failureCode(res, status, ErrorCodes.GET_AVAILABLE_PRODUCTS_FAILED, undefined, message);
    }
    return failureCode(res, 500, ErrorCodes.GET_AVAILABLE_PRODUCTS_FAILED, undefined, message || 'Failed to fetch available products');
  }
};
