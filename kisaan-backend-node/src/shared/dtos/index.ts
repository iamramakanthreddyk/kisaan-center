/**
 * Data Transfer Objects (DTOs)
 * These define the shape of data coming into and going out of the API
 */

/**
 * User DTOs
 */
export interface CreateUserDTO {
  username: string;
  email?: string;
  password: string;
  role: 'owner' | 'farmer' | 'buyer';
  shop_id?: number;
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  shop_id?: number;
}

export interface UserDTO {
  id: number;
  username: string;
  email: string;
  role: string;
  shop_id?: number;
  balance?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserFilterDTO {
  role?: string;
  status?: string;
  shop_id?: number;
  search?: string;
}

/**
 * Shop DTOs
 */
export interface CreateShopDTO {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_id: number;
  plan_id?: number;
}

export interface UpdateShopDTO {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  plan_id?: number;
  isActive?: boolean;
}

export interface ShopResponseDTO {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  owner_id: number;
  plan_id: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contactInfo: string;
  hasActivePlan: boolean;
  owner?: UserDTO;
  plan?: PlanResponseDTO;
}

/**
 * Product DTOs
 */
export interface CreateProductDTO {
  name: string;
  description?: string;
  category_id?: number;
  unit: string;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  category_id?: number;
  unit?: string;
  isActive?: boolean;
}

export interface ProductResponseDTO {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  unitDisplay: string;
  category?: CategoryResponseDTO;
}

/**
 * Transaction DTOs
 */
export interface CreateTransactionDTO {
  shop_id: number;
  farmer_id?: number;
  buyer_id?: number;
  product_id: number;
  quantity: number;
  price_per_unit: number;
  commission_rate?: number;
  notes?: string;
}

export interface UpdateTransactionDTO {
  quantity?: number;
  price_per_unit?: number;
  commission_rate?: number;
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface TransactionResponseDTO {
  id: number;
  shop_id: number;
  farmer_id: number | null;
  buyer_id: number | null;
  product_id: number;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  transaction_date: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  net_amount: number;
  farmer_earning: number;
  canBeModified: boolean;
  shop?: ShopResponseDTO;
  farmer?: UserDTO;
  buyer?: UserDTO;
  product?: ProductResponseDTO;
}

/**
 * Category DTOs
 */
export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryResponseDTO {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Plan DTOs
 */
export interface CreatePlanDTO {
  name: string;
  description?: string;
  price: number;
  duration: number;
  max_users?: number;
  max_transactions?: number;
  features: string[];
}

export interface UpdatePlanDTO {
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  max_users?: number;
  max_transactions?: number;
  features?: string[];
  isActive?: boolean;
}

export interface PlanResponseDTO {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  max_users: number | null;
  max_transactions: number | null;
  isActive: boolean;
  features: string[];
  createdAt: string;
  updatedAt: string;
  monthly_price: number;
}

/**
 * Authentication DTOs
 */
export interface LoginDTO {
  username: string;
  password: string;
}

export interface LoginResponseDTO {
  token: string;
  user: UserDTO;
  expiresIn: number;
}

/**
 * Query DTOs
 */
export interface PaginationQueryDTO {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserFilterDTO extends PaginationQueryDTO {
  role?: string;
  shop_id?: number;
  isActive?: boolean;
  search?: string;
}

export interface TransactionFilterDTO extends PaginationQueryDTO {
  shop_id?: number;
  farmer_id?: number;
  buyer_id?: number;
  product_id?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface ProductFilterDTO extends PaginationQueryDTO {
  category_id?: number;
  isActive?: boolean;
  search?: string;
}

/**
 * Analytics DTOs
 */
export interface DashboardStatsDTO {
  total_users: number;
  total_shops: number;
  total_transactions: number;
  total_revenue: number;
  recent_transactions: TransactionResponseDTO[];
}

export interface ShopAnalyticsDTO {
  total_transactions: number;
  total_revenue: number;
  total_commission: number;
  active_farmers: number;
  active_buyers: number;
  top_products: Array<{
    product: ProductResponseDTO;
    quantity: number;
    revenue: number;
  }>;
}