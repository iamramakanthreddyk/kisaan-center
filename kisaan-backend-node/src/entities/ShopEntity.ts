// Entity representing the database structure for Shop
export class ShopEntity {
  id?: number;
  name?: string;
  owner_id?: number;
  plan_id?: number | null;
  location?: string;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  status?: 'active' | 'inactive';
  commission_rate?: number;
  settings?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;

  constructor(init?: Partial<ShopEntity>) {
    Object.assign(this, init);
  }
}
