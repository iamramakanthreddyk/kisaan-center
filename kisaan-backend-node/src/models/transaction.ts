
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { TransactionStatus } from '../shared/enums';

// Re-export for backward compatibility
export { TransactionStatus };

export interface TransactionAttributes {
  id: number;
  shop_id: number;
  farmer_id: number;
  buyer_id: number;
  category_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_sale_value: number;  // Database column name: total_sale_value
  shop_commission: number;   // Database column name: shop_commission (not commission_amount)
  farmer_earning: number;
  // Legacy aliases for backward compatibility
  total_amount?: number;
  commission_amount?: number;
  product_id?: number | null;
  commission_rate?: number | null;
  commission_type?: string | null;
  status?: TransactionStatus;
  transaction_date?: Date | null;
  settlement_date?: Date | null;
  notes?: string | null;
  metadata?: object | null;
  
  // Settlement tracking fields (added by migration 20251019_05)
  settled_amount?: number;
  pending_amount?: number;
  settlement_status?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
  
  // Counterparty field (added by migration 20251214_15)
  counterparty_id?: number | null;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: number;
  public shop_id!: number;
  public farmer_id!: number;
  public buyer_id!: number;
  public category_id!: number;
  public product_name!: string;
  public quantity!: number;
  public unit_price!: number;
  public total_sale_value!: number;
  public shop_commission!: number;
  public farmer_earning!: number;
  // Legacy aliases
  public get total_amount(): number { return this.total_sale_value; }
  public get commission_amount(): number { return this.shop_commission; }
  public product_id?: number | null;
  public commission_rate?: number | null;
  public commission_type?: string | null;
  public status?: TransactionStatus;
  public transaction_date?: Date | null;
  public settlement_date?: Date | null;
  public notes?: string | null;
  public metadata?: object | null;
  
  // Settlement tracking fields
  public settled_amount?: number;
  public pending_amount?: number;
  public settlement_status?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
  
  // Counterparty field
  public counterparty_id?: number | null;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  // Add hooks for audit fields if custom logic is needed
}

Transaction.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    shop_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_shops', key: 'id' } },
    farmer_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_users', key: 'id' } },
    buyer_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_users', key: 'id' } },
    category_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_categories', key: 'id' } },
    product_name: { type: DataTypes.STRING(255), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    total_sale_value: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    shop_commission: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    farmer_earning: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    product_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_products', key: 'id' } },
    commission_rate: { type: DataTypes.DECIMAL(6,4), allowNull: true },
    commission_type: { type: DataTypes.STRING(30), allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(TransactionStatus)), allowNull: true, defaultValue: TransactionStatus.Pending },
    transaction_date: { type: DataTypes.DATE, allowNull: true },
    settlement_date: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    
    // Settlement tracking fields (added by migration 20251019_05)
    settled_amount: { type: DataTypes.DECIMAL(12,2), allowNull: true, defaultValue: 0, validate: { min: 0 } },
    pending_amount: { type: DataTypes.DECIMAL(12,2), allowNull: true },
    settlement_status: { 
      type: DataTypes.STRING(50), 
      allowNull: true, 
      defaultValue: 'UNSETTLED',
      validate: { isIn: [['UNSETTLED', 'PARTIALLY_SETTLED', 'FULLY_SETTLED']] }
    },
    
    // Counterparty field (added by migration 20251214_15)
    counterparty_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_users', key: 'id' } },
    
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'kisaan_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // Index for queries by shop
      { fields: ['shop_id'] },
      // Index for queries by farmer
      { fields: ['farmer_id'] },
      // Index for queries by buyer
      { fields: ['buyer_id'] },
      // Index for queries by category
      { fields: ['category_id'] },
      // Index for queries by created_at
      { fields: ['created_at'] },
      // Index for queries by product
      { fields: ['product_id'] },
      // Composite index for shop and created_at
      { fields: ['shop_id', 'created_at'] },
      // Composite index for farmer and created_at
      { fields: ['farmer_id', 'created_at'] },
      // Composite index for buyer and created_at
      { fields: ['buyer_id', 'created_at'] },
      // Composite index for shop and farmer
      { fields: ['shop_id', 'farmer_id'] },
      // Composite index for shop and buyer
      { fields: ['shop_id', 'buyer_id'] },
      // Composite index for shop, farmer, buyer, and status
      { fields: ['shop_id', 'farmer_id', 'buyer_id', 'status'] },
    ],
  }
);




