/**
 * Shop Service
 * Business logic layer for Shop operations
 * Follows clean architecture: Controller -> Service -> Repository -> Database
 */

import { ShopRepository } from '../repositories/ShopRepository';
import { UserRepository } from '../repositories/UserRepository';
import { PlanService } from './planService';
import { ShopCategoryService } from './shopCategoryService';
import { ShopEntity } from '../entities/ShopEntity';
import { UserEntity } from '../entities/UserEntity';
import { UserDTO } from '../dtos/UserDTO';
import { ValidationError, NotFoundError, BusinessRuleError, AuthorizationError, DatabaseError } from '../shared/utils/errors';
import { StringFormatter } from '../shared/utils/formatting';
import { USER_ROLES, SHOP_STATUS } from '../shared/constants/index';
import { toUserDTO } from '../mappers/userMapper';
import { withTransaction } from '../shared/db/withTransaction';
import sequelize from '../config/database';

export class ShopService {
  private shopRepository: ShopRepository;
  private userRepository: UserRepository;
  private planService: PlanService;
  private shopCategoryService: ShopCategoryService;

  constructor() {
    this.shopRepository = new ShopRepository();
    this.userRepository = new UserRepository();
    this.planService = new PlanService();
    this.shopCategoryService = new ShopCategoryService();
  }

  /**
   * Create a new shop
   */
  async createShop(data: {
    name: string;
    owner_id: number;
    location: string;
    address?: string;
    contact?: string;
    email?: string;
    plan_id?: number;
    commission_rate?: number;
    category_id: number;
  }, requestingUser?: { role: string; id: number }): Promise<ShopEntity> {
    try {
      // Authorization check
      if (requestingUser?.role !== USER_ROLES.SUPERADMIN) {
        throw new AuthorizationError('Only superadmin can create shops');
      }

      // Validate required fields
      if (!data.name?.trim()) {
        throw new ValidationError('Shop name is required');
      }
      if (!data.owner_id) {
        throw new ValidationError('Owner ID is required');
      }
      if (!data.category_id) {
        throw new ValidationError('Category ID is required');
      }
      // Allow location to default to address if not provided
      if (!data.location?.trim()) {
        if (data.address?.trim()) {
          data.location = data.address.trim();
        } else {
          throw new ValidationError('Location is required. Please provide a location or address.');
        }
      }

      // Validate owner exists and is an owner role
      const owner = await this.userRepository.findById(data.owner_id);
      if (!owner) {
        throw new NotFoundError('Owner not found');
      }
      if (owner.role !== USER_ROLES.OWNER) {
        throw new BusinessRuleError('User must be an owner to create a shop');
      }

      // Check if owner already has a shop
      const existingShops = await this.shopRepository.findByOwner(data.owner_id);
      if (existingShops.length > 0) {
    const shop = existingShops[0];
    throw new BusinessRuleError(`Owner already has a shop (Shop ID: ${shop.id}, Name: ${shop.name}). Please delete or update the existing shop before creating a new one.`);
      }

      // Always assign a valid plan to the shop
      let planId = data.plan_id;
      if (!planId) {
        // Fetch default plan (Basic)
        const defaultPlan = await this.planService.getDefaultPlan();
        if (!defaultPlan) {
          throw new ValidationError('No default (Basic) plan available to assign to shop');
        }
        planId = defaultPlan.id;
      }

      // Create shop entity
      const shopEntity = new ShopEntity({
        name: StringFormatter.sanitizeInput(data.name.trim()),
        owner_id: data.owner_id,
        location: StringFormatter.sanitizeInput(data.location.trim()),
        address: data.address?.trim() || null,
        contact: data.contact?.trim() || null,
        email: data.email?.trim() || null,
        plan_id: planId,
        commission_rate: data.commission_rate || 0,
        status: SHOP_STATUS.ACTIVE
      });

      return await withTransaction(sequelize, async (tx) => {
        const createdShop = await this.shopRepository.create(shopEntity, { tx });

        // Assign the selected category to the shop
        if (!createdShop.id) {
          throw new DatabaseError('Failed to create shop - no ID returned');
        }
        await this.shopCategoryService.assignCategoryToShop({
          shop_id: createdShop.id,
          category_id: data.category_id
        }, { tx });

        // Update owner's shop_id
        const updatedOwner = new UserEntity({
          ...owner,
          shop_id: createdShop.id
        });
        await this.userRepository.update(data.owner_id, updatedOwner, { tx });

        return createdShop;
      });
    } catch (error) {
      // Enhanced diagnostic logging before error mapping so we can surface root cause of generic DatabaseError
      // (Avoid importing logger directly here to keep service decoupled; use console for now – upgrade later to injected logger)
      const diag: {
        name?: string;
        message?: string;
        original?: string;
        sql?: string;
        fields?: Record<string, unknown>;
      } = {};
      if (error && typeof error === 'object') {
        const errObj = error as { [key: string]: unknown };
        diag.name = typeof errObj.name === 'string' ? errObj.name : undefined;
        diag.message = typeof errObj.message === 'string' ? errObj.message : undefined;
        diag.original = typeof errObj.original === 'object' && errObj.original && 'message' in errObj.original ? (errObj.original as { message?: string }).message : undefined;
        diag.sql = typeof errObj.original === 'object' && errObj.original && 'sql' in errObj.original ? (errObj.original as { sql?: string }).sql : (typeof errObj.sql === 'string' ? errObj.sql : undefined);
        diag.fields = {
          name: data.name,
          owner_id: data.owner_id,
          plan_id: data.plan_id,
          location: data.location,
          address: data.address,
          contact: data.contact,
          email: data.email,
          commission_rate: data.commission_rate,
          category_id: data.category_id
        };
      }
      // Only log if it's not one of the expected business/validation errors
      if (error instanceof ValidationError || error instanceof NotFoundError || 
          error instanceof BusinessRuleError || error instanceof AuthorizationError) {
        throw error;
      }
      // Emit structured console log for now (will be captured by pino if stdout intercepted at process level)
      // Use a single line to simplify parsing in tests
      console.error('[ShopService.createShop] diagnostic', JSON.stringify(diag));
      // Temporarily expose original DB error outward for debugging (flag consumed by DatabaseError)
      if (diag) (diag as Record<string, unknown>).allowExposeOriginal = true;
      throw new DatabaseError('Failed to create shop', error instanceof Error ? { message: error.message, diagnostic: diag } : { diagnostic: diag });
    }
  }

  /**
   * Get all shops with filtering and authorization
   */
  async getAllShops(filters?: {
    ownerId?: number;
    status?: string;
  }, requestingUser?: { role: string; id: number }): Promise<ShopEntity[]> {
    try {
      // Authorization and filtering logic
      if (requestingUser?.role === USER_ROLES.OWNER) {
        // Owners can only see their own shops
        return await this.shopRepository.findByOwner(requestingUser.id);
      } else if (requestingUser?.role === USER_ROLES.SUPERADMIN) {
        // Superadmin can see all shops with optional filtering
        if (filters?.ownerId) {
          return await this.shopRepository.findByOwner(filters.ownerId);
        }
        if (filters?.status) {
          return await this.shopRepository.findActive();
        }
        return await this.shopRepository.findAll();
      } else {
        throw new AuthorizationError('Insufficient permissions to view shops');
      }
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve shops', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get shop by ID with authorization
   */
  async getShopById(id: number, requestingUser?: { role: string; id: number }): Promise<ShopEntity> {
    try {
      if (!id || id <= 0) {
        throw new ValidationError('Valid shop ID is required');
      }

      const shop = await this.shopRepository.findById(id);
      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      // Authorization check
      if (requestingUser?.role === USER_ROLES.OWNER && shop.owner_id !== requestingUser.id) {
        throw new AuthorizationError('Access denied to this shop');
      }

      return shop;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve shop', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Update shop
   */
  async updateShop(id: number, data: Partial<{
    name: string;
    location: string;
    address: string;
    contact: string;
    email: string;
    plan_id: number;
    commission_rate: number;
    status: 'active' | 'inactive';
  }>, requestingUser?: { role: string; id: number }): Promise<ShopEntity | null> {
    try {
      const existingShop = await this.getShopById(id, requestingUser);
      const updateEntity = new ShopEntity({
        ...existingShop,
        ...data,
        name: data.name ? StringFormatter.sanitizeInput(data.name.trim()) : existingShop.name,
        address: data.address ? data.address.trim() : existingShop.address,
        contact: data.contact ? data.contact.trim() : existingShop.contact,
        email: data.email ? data.email.trim() : existingShop.email
      });
      const updatedShop = await this.shopRepository.update(id, updateEntity);
      if (!updatedShop) {
        throw new DatabaseError('Shop update failed or shop not found');
      }
      return updatedShop;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update shop', error instanceof Error ? { message: error.message } : undefined);
    }
  }
  async deleteShop(id: number, requestingUser?: { role: string; id: number }): Promise<boolean> {
    try {
      const existingShop = await this.getShopById(id, requestingUser);

      // Authorization check
      if (requestingUser?.role !== USER_ROLES.SUPERADMIN) {
        throw new AuthorizationError('Only superadmin can delete shops');
      }

      // Update owner's shop_id to null
      const owner = await this.userRepository.findById(existingShop.owner_id!);
      if (owner) {
        const updatedOwner = new UserEntity({
          ...owner,
          shop_id: null
        });
        await this.userRepository.update(existingShop.owner_id!, updatedOwner);
      }

      await this.shopRepository.delete(id);
      return true;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete shop', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get available owners (users with owner role who don't have a shop)
   */
  async getAvailableOwners(): Promise<UserDTO[]> {
    try {
      const allOwners = await this.userRepository.findByRole(USER_ROLES.OWNER);
      
      // Filter out owners who already have shops and transform to DTO
      const availableOwners: UserDTO[] = [];
      for (const owner of allOwners) {
        if (!owner.shop_id) {
          const ownerDTO = await toUserDTO(owner);
          availableOwners.push(ownerDTO);
        }
      }
      return availableOwners;
    } catch (error) {
      throw new DatabaseError('Failed to retrieve available owners', error instanceof Error ? { message: error.message } : undefined);
    }
  }



  /**
   * Get shops for superadmin view
   */
  async getShopsForSuperadmin(): Promise<ShopEntity[]> {
    return this.shopRepository.findAll();
  }

  /**
   * Deactivate shop
   */
  async deactivateShop(id: number, requestingUser?: { role: string; id: number }): Promise<ShopEntity> {
    const updatedShop = await this.updateShop(id, { status: SHOP_STATUS.INACTIVE }, requestingUser);
    if (!updatedShop) {
      throw new DatabaseError('Failed to deactivate shop: shop not found or update failed');
    }
    return updatedShop;
  }
}
