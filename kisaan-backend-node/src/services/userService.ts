// Type for requestingUser used in getAllUsers
export interface RequestingUser {
  id: number | string;
  role: string;
  owner_id?: string | number | null;
  shop_id?: string | number | null;
  username?: string;
  [key: string]: unknown;
}
// User service for business logic related to users
import { USER_ROLES } from '../shared/constants/index';

import { UserRepository } from '../repositories/UserRepository';
import { UserDTO } from '../dtos';
import { toUserDTO, fromUserModel as _fromUserModel } from '../mappers/userMapper';
import { UserEntity } from '../entities/UserEntity';
import { 
  UserCreate, 
  UserUpdate, 
  UserPasswordReset, 
  UserSearch,
  UserRole 
} from '../schemas/user';

// Import shared utilities and constants
import { PasswordManager } from '../shared/utils/auth';
import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError
} from '../shared/utils/errors';

/**
 * Generates username following multi-tenancy convention using shared utilities
 */

/**
 * Validates role creation permissions using shared constants
 */
function validateRoleCreation(
  requestingUserRole: UserRole,
  targetRole: UserRole
): boolean {
  if (requestingUserRole === USER_ROLES.SUPERADMIN) {
    return (targetRole === USER_ROLES.SUPERADMIN || targetRole === USER_ROLES.OWNER);
  }
  if (requestingUserRole === USER_ROLES.OWNER) {
    return (targetRole === USER_ROLES.FARMER || targetRole === USER_ROLES.BUYER);
  }
  return false;
}



export const createUser = async (
  data: UserCreate,
  requestingUserId?: number,
  requestingUserRole?: UserRole
): Promise<UserDTO> => {
  const userRepo = new UserRepository();
  // Validate input data
  if (!data.role) {
    throw new ValidationError('Role is required');
  }
  if (requestingUserRole && !validateRoleCreation(requestingUserRole, data.role)) {
    throw new AuthenticationError(`${requestingUserRole} cannot create ${data.role} users`);
  }
  const userData = { ...data };
  userData.balance = typeof userData.balance === 'number' ? userData.balance : 0;
  // Always set contact field, default to empty string if not provided
  userData.contact = typeof userData.contact === 'string' ? userData.contact : '';
  if (userData.role === USER_ROLES.OWNER || userData.role === USER_ROLES.SUPERADMIN) {
    userData.shop_id = null;
  }
  // Auto-generate username if not provided
  if (!userData.username) {
  const baseName = 'user';
    const shopIdPart = userData.shop_id ? userData.shop_id.toString() : '0';
    let uniqueNum = 1;
    let candidate = `${baseName}_${shopIdPart}_${uniqueNum}`;
    while (await userRepo.usernameExists(candidate)) {
      uniqueNum++;
      candidate = `${baseName}_${shopIdPart}_${uniqueNum}`;
    }
    userData.username = candidate;
  } else {
    if (await userRepo.usernameExists(userData.username)) {
      const { ConflictError } = await import('../shared/utils/errors');
      throw new ConflictError('Username already exists', { code: 'USER_ALREADY_EXISTS', field: 'username' });
    }
  }
  // Validate shop exists for farmer/buyer
  if ((data.role === USER_ROLES.FARMER || data.role === USER_ROLES.BUYER) && userData.shop_id) {
    const { Shop } = await import('../models/shop');
    const shop = await Shop.findByPk(userData.shop_id);
    if (!shop) {
      throw new ValidationError('Invalid shop_id: Shop does not exist');
    }
  }
  userData.created_by = requestingUserId || null;
  if (userData.password) {
    const passwordManager = new PasswordManager();
    userData.password = await passwordManager.hashPassword(userData.password);
  }
  const entity = await userRepo.create(userData);
  return await toUserDTO(entity);
};

export const getAllUsers = async (
  searchParams: UserSearch,
  requestingUser: RequestingUser
): Promise<{ users: UserDTO[]; total: number; page: number; limit: number }> => {
  const userRepo = new UserRepository();
  let result: { users: UserEntity[]; total: number };

  // Role-based filtering with proper pagination
  if (requestingUser.role === USER_ROLES.OWNER) {
    // Owner's shop_id is null in their record, so fetch from shops table
    let shopId = requestingUser.shop_id ? Number(requestingUser.shop_id) : undefined;
    if (!shopId) {
      // Get owner's shop from shops table
      const { Shop } = await import('../models/shop');
      const shop = await Shop.findOne({ where: { owner_id: requestingUser.id } });
      if (!shop) {
        console.warn('[USER_SERVICE] Owner has no shop:', requestingUser);
        return { users: [], total: 0, page: searchParams.page, limit: searchParams.limit };
      }
      shopId = shop.id;
    }
    
    // Use paginated query for owner's shop users
    result = await userRepo.findByShopPaginated(shopId, searchParams.page, searchParams.limit);
  } else if (requestingUser.role === USER_ROLES.FARMER || requestingUser.role === USER_ROLES.BUYER) {
    // Farmers and buyers can only see themselves
    const user = await userRepo.findById(typeof requestingUser.id === 'string' ? Number(requestingUser.id) : requestingUser.id);
    result = user ? { users: [user], total: 1 } : { users: [], total: 0 };
  } else {
    // Superadmin sees all users with proper pagination and filtering
    const filters: { role?: string; shop_id?: number; status?: string } = {};
    if (searchParams.role) filters.role = searchParams.role;
    if (searchParams.shop_id) filters.shop_id = Number(searchParams.shop_id);
    if (searchParams.status) filters.status = searchParams.status;
    
    result = await userRepo.findAllPaginated(searchParams.page, searchParams.limit, filters);
  }

  const users = await Promise.all(result.users.map(async (entity) => {
    let userDTO = await toUserDTO(entity);
    // Case-insensitive check for owner role
    if (typeof userDTO.role === 'string' && userDTO.role.toLowerCase() === 'owner' && (!userDTO.shop_id || userDTO.shop_id === null)) {
      try {
        const { Shop } = await import('../models/shop');
        const shop = await Shop.findOne({ where: { owner_id: Number(userDTO.id) } });
        if (shop) {
          userDTO = { ...userDTO, shop_id: shop.id };
          entity.shop_id = shop.id;
        }
      } catch (err) {
        // log error but continue
      }
    }
    return userDTO;
  }));

  return { users, total: result.total, page: searchParams.page, limit: searchParams.limit };
};

export const getUserById = async (
  id: number,
  requestingUser: { id: number; role: UserRole; owner_id?: string | null }
): Promise<UserDTO | null> => {
  const userRepo = new UserRepository();
  const user = await userRepo.findById(id);
  if (!user) return null;
  // Permission check
  if (requestingUser.role === USER_ROLES.SUPERADMIN) {
    // Can view anyone
  } else if (requestingUser.role === USER_ROLES.OWNER) {
    if (user.id !== requestingUser.id) {
      if (!user.shop_id) throw new AuthenticationError('Access denied');
      // You may want to fetch shop and check owner_id here if needed
      // For now, assume shop_id is sufficient
    }
  } else {
    if (user.id !== requestingUser.id) {
      throw new AuthenticationError('Access denied');
    }
  }
  return await toUserDTO(user);
};

export const updateUser = async (
  id: number,
  data: UserUpdate,
  requestingUser: { id: number; role: UserRole; owner_id?: string | null }
): Promise<UserDTO | null> => {
  const userRepo = new UserRepository();
  const user = await userRepo.findById(id);
  if (!user) throw new NotFoundError('User not found');
  if (requestingUser.role === USER_ROLES.SUPERADMIN) {
    // Can update anyone
  } else if (requestingUser.role === USER_ROLES.OWNER) {
    if (user.id !== requestingUser.id) {
      if (!user.shop_id) throw new AuthenticationError('Access denied');
      // You may want to fetch shop and check owner_id here if needed
    }
  } else {
    if (user.id !== requestingUser.id) {
      throw new AuthenticationError('Access denied');
    }
  }
  if (data.password) {
    const passwordManager = new PasswordManager();
    data.password = await passwordManager.hashPassword(data.password);
  }
  const updated = await userRepo.update(id, data);
  return updated ? toUserDTO(updated) : null;
};

export const resetPassword = async (
  userId: number,
  passwordData: UserPasswordReset
): Promise<void> => {
  const userRepo = new UserRepository();
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  const passwordManager = new PasswordManager();
  const isValid = await passwordManager.verifyPassword(passwordData.current_password, user.password ?? '');
  if (!isValid) throw new ValidationError('Current password is incorrect');
  const hashedPassword = await passwordManager.hashPassword(passwordData.new_password);
  await userRepo.update(userId, { password: hashedPassword });
};

export const adminResetPassword = async (
  userId: number,
  newPassword: string,
  requestingUser: { id: number; role: UserRole }
): Promise<void> => {
  if (requestingUser.role !== USER_ROLES.SUPERADMIN && requestingUser.role !== USER_ROLES.OWNER) {
    throw new AuthenticationError('Access denied');
  }
  const userRepo = new UserRepository();
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  const passwordManager = new PasswordManager();
  const hashedPassword = await passwordManager.hashPassword(newPassword);
  await userRepo.update(userId, { password: hashedPassword });
};

export const deleteUser = async (
  id: number,
  requestingUser: { id: number; role: UserRole; owner_id?: string | null }
): Promise<boolean> => {
  const userRepo = new UserRepository();
  const user = await userRepo.findById(id);
  if (!user) throw new NotFoundError('User not found');
  if (requestingUser.id === id) {
    throw new ValidationError('Cannot delete your own account');
  }
  if (requestingUser.role === USER_ROLES.SUPERADMIN) {
    // Can delete anyone except themselves
  } else if (requestingUser.role === USER_ROLES.OWNER) {
    if (!user.shop_id) throw new AuthenticationError('Access denied');
    // You may want to fetch shop and check owner_id here if needed
  } else {
    throw new AuthenticationError('Access denied');
  }
  await userRepo.delete(id);
  return true;
};
