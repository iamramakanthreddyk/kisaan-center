// src/dtos/UserDTO.ts
// DTOs for User API input/output

export interface UserDTO {
  id: number;
  username: string;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer' | 'employee';
  owner_id?: string | null;
  shop_id?: number | null;
  contact?: string | null;
  email?: string | null;
  firstname?: string | null;
  balance: number;
  created_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
  custom_commission_rate?: number | null;
  // Computed fields (not stored in database):
  status: 'active' | 'inactive';        // Computed from user activity or default 'active'
  cumulative_value: number;             // Computed based on role:
                                        // - Farmer: sum of total_amount from their sales
                                        // - Buyer: sum of total_amount from their purchases
                                        // - Owner: sum of commission_amount from shop transactions
}

export interface CreateUserDTO {
  username?: string;
  password: string;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer' | 'employee';
  owner_id?: string | null;
  shop_id?: number | null;
  contact?: string | null;
  email?: string | null;
  firstname?: string | null;
}

export interface UpdateUserDTO {
  username?: string;
  password?: string;
  role?: 'superadmin' | 'owner' | 'farmer' | 'buyer' | 'employee';
  shop_id?: number | null;
  contact?: string | null;
  email?: string | null;
  firstname?: string | null;
  // Removed: status - not in database schema
}
