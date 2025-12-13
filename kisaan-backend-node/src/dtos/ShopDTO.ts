// DTOs for Shop API input/output
export interface ShopDTO {
  id: number;
  name: string;
  owner_id: number;
  plan_id?: number | null;
  location?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  commission_rate?: number | null;
  status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateShopDTO {
  name: string;
  owner_id: number;
  plan_id?: number | null;
  location?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  commission_rate?: number | null;
}

export interface UpdateShopDTO {
  name?: string;
  location?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  commission_rate?: number | null;
  status?: 'active' | 'inactive';
}
