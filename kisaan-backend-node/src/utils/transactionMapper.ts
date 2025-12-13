import { TransactionEntity } from '../entities/TransactionEntity';

// Map internal entity fields to stable external contract
export function mapTransactionResponse(entity: TransactionEntity) {
  if (!entity) return null;
  return {
    id: entity.id,
    shop_id: entity.shop_id,
    farmer_id: entity.farmer_id,
    buyer_id: entity.buyer_id,
    product_id: entity.product_id,
    category_id: entity.category_id,
    product_name: entity.product_name,
    quantity: entity.quantity,
    unit_price: entity.unit_price,
    total_amount: entity.total_amount,
    commission_amount: entity.commission_amount,
    farmer_earning: entity.farmer_earning,
    commission_rate: entity.commission_rate,
    status: entity.status,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}
