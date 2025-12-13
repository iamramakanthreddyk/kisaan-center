/**
 * User-related type definitions
 */

export interface UserDTO {
  id: number;
  username: string;
  firstname: string;
  email: string;
  contact?: string;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer' | 'employee';
  shop_id?: number;
  shop_name?: string;
  balance: number;
  custom_commission_rate?: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserFilters {
  role?: string;
  shop_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserContext {
  id: number;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer' | 'employee';
  shop_id?: number | null;
  username: string;
}

export interface CreateUserRequest {
  username: string;
  firstname: string;
  email: string;
  password: string;
  contact?: string;
  role: 'farmer' | 'buyer' | 'employee';
  shop_id: number;
  custom_commission_rate?: number;
}

export interface UpdateUserRequest {
  username?: string;
  firstname?: string;
  email?: string;
  contact?: string;
  custom_commission_rate?: number;
  balance?: number;
}

export interface UserWithShop extends UserDTO {
  shop?: {
    id: number;
    name: string;
  };
}