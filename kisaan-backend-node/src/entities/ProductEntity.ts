/**
 * ProductEntity - Domain Entity for Product
 */
export class ProductEntity {
  id?: number;
  name?: string;
  category_id?: number;
  description?: string | null;
  unit?: string;
  // Pricing now handled per-transaction; base_price removed
  // status field not persisted in schema; lifecycle handled via record_status if needed
  sku?: string | null;
  barcode?: string | null;
  specifications?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;

  constructor(init?: Partial<ProductEntity>) {
    Object.assign(this, init);
  }
}