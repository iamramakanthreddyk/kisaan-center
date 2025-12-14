import { ShopCategory } from '../models/shopCategory';
import { Shop } from '../models/shop';
import { Category } from '../models/category';
import {
  ShopCategoryCreate,
  AssignCategoriesToShop,
  RemoveCategoriesFromShop
} from '../schemas/shopCategory';
import { Transaction } from 'sequelize';
import sequelize from '../config/database';

export class ShopCategoryService {
  async assignCategoryToShop(data: ShopCategoryCreate, options?: { tx?: Transaction }): Promise<ShopCategory> {
    const createOpts = options?.tx ? { transaction: options.tx } : undefined;
    const shopCategory = await ShopCategory.create({
      shop_id: data.shop_id,
      category_id: data.category_id,
    }, createOpts);
    return shopCategory;
  }

  async assignCategoriesToShop(data: AssignCategoriesToShop): Promise<ShopCategory[]> {
    const transaction: Transaction = await sequelize.transaction();
    
    try {
      const shopCategories: ShopCategory[] = [];
      const duplicates: number[] = [];
      
      for (const category_id of data.category_ids) {
        // Check if assignment already exists
        const existing = await ShopCategory.findOne({
          where: {
            shop_id: data.shop_id,
            category_id: category_id,
          },
          transaction,
        });
        
        if (existing) {
          duplicates.push(category_id);
        } else {
          const shopCategory = await ShopCategory.create({
            shop_id: data.shop_id,
            category_id: category_id,
          }, { transaction });
          
          shopCategories.push(shopCategory);
        }
      }
      
      await transaction.commit();
      
      // If all categories were duplicates, throw error
      if (duplicates.length === data.category_ids.length) {
  const error = new Error('All category assignments already exist');
  (error as { name?: string }).name = 'SequelizeUniqueConstraintError';
  throw error;
      }
      
      return shopCategories;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeCategoriesFromShop(data: RemoveCategoriesFromShop): Promise<number> {
    const deletedCount = await ShopCategory.destroy({
      where: {
        shop_id: data.shop_id,
        category_id: data.category_ids,
      },
    });
    return deletedCount;
  }

  async getShopCategories(shopId: number): Promise<Category[]> {
    const shop = await Shop.findByPk(shopId, {
      include: [
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] }, // Exclude join table attributes
          where: { status: 'active' },
          required: false,
        },
      ],
    });
    
  return (shop && typeof shop === 'object' && 'categories' in shop) ? (shop as { categories?: Category[] }).categories || [] : [];
  }

  async getCategoryShops(categoryId: number): Promise<Shop[]> {
    const category = await Category.findByPk(categoryId, {
      include: [
        {
          model: Shop,
          as: 'shops',
          through: { attributes: [] }, // Exclude join table attributes
          where: { status: 'active' },
          required: false,
        },
      ],
    });
    
  return (category && typeof category === 'object' && 'shops' in category) ? (category as { shops?: Shop[] }).shops || [] : [];
  }

  async isShopCategoryAssigned(shopId: number, categoryId: number): Promise<boolean> {
    const assignment = await ShopCategory.findOne({
      where: {
        shop_id: shopId,
        category_id: categoryId,
      },
    });
    
    return !!assignment;
  }

  async getShopCategoryAssignments(shopId?: number, categoryId?: number): Promise<ShopCategory[]> {
  const where: Record<string, unknown> = {};
    if (shopId) where.shop_id = shopId;
    if (categoryId) where.category_id = categoryId;
    
    const assignments = await ShopCategory.findAll({
      where,
      include: [
        {
          model: Shop,
          as: 'categoryShop',
          attributes: ['id', 'name', 'status'],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'status'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    
    return assignments;
  }

  async removeAllCategoriesFromShop(shopId: number): Promise<number> {
    const deletedCount = await ShopCategory.destroy({
      where: { shop_id: shopId },
    });
    return deletedCount;
  }

  async removeShopFromAllCategories(shopId: number): Promise<number> {
    return this.removeAllCategoriesFromShop(shopId);
  }
}
