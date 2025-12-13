// This file is auto-generated from backend swagger.json for model sync
// Only main models included for now

export interface User {
  id: number;
  username: string;
  password: string;
  role: 'superadmin' | 'owner' | 'farmer' | 'buyer';
  owner_id?: string | null;
  shop_id?: number | null;
  contact?: string | null;
  email?: string | null;
  status: 'active' | 'inactive';
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number;
  description?: string | null;
  price?: number;
  shop_id?: number | null;
  record_status?: string | null;
  unit?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: number;
  shop_id: number;
  farmer_id: string;
  buyer_id: string;
  product_id: number;
  quantity: number;
  price: number;
  total: number;
  commission_rate?: number;
  commission_amount?: number;
  farmer_paid?: number;
  buyer_paid?: number;
  deficit?: number;
  status: 'pending' | 'paid' | 'partial' | 'credit' | 'farmer_due';
  transaction_date: string;
  created_at: string;
  updated_at: string;
}
