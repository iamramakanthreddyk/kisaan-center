import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { PaymentParty, PaymentStatus, PaymentMethod, SettlementType } from '../shared/enums';

// Re-export for backward compatibility
export { PaymentParty, PaymentStatus, PaymentMethod, SettlementType };

export interface PaymentAttributes {
  id: number;
  transaction_id?: number | null;
  shop_id?: number | null;
  payer_type: PaymentParty; // Future-proof: add new parties here
  payee_type: PaymentParty; // Future-proof: add new parties here
  amount: number;
  status: PaymentStatus; // Future-proof: add new statuses here
  payment_date?: Date;
  method: PaymentMethod; // Future-proof: add new methods here
  notes?: string;
  counterparty_id?: number | null;

  // Enhanced Settlement Tracking (New)
  settlement_type?: SettlementType;
  balance_before?: number | null;
  balance_after?: number | null;
  // Amount applied by this payment towards expenses (e.g. expense settlements)
  applied_to_expenses?: number | null;
  // Amount applied by this payment towards stored balance (reducing unpaid txn amounts)
  applied_to_balance?: number | null;
  settled_transactions?: number[] | null;
  settled_expenses?: number[] | null;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}


export interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'status' | 'payment_date' | 'notes' | 'counterparty_id' | 'shop_id' | 'transaction_id' | 'settlement_type' | 'balance_before' | 'balance_after' | 'settled_transactions' | 'settled_expenses' | 'created_at' | 'updated_at'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: number;
  public transaction_id!: number | null;
  public shop_id!: number | null;
  public payer_type!: PaymentParty;
  public payee_type!: PaymentParty;
  public amount!: number;
  public status!: PaymentStatus;
  public payment_date?: Date;
  public method!: PaymentMethod;
  public notes?: string;
  public counterparty_id!: number | null;

  // Enhanced Settlement Tracking
  public settlement_type?: SettlementType;
  public balance_before?: number | null;
  public balance_after?: number | null;
  public applied_to_expenses?: number | null;
  public applied_to_balance?: number | null;
  public settled_transactions?: number[] | null;
  public settled_expenses?: number[] | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  // Add hooks for audit fields if custom logic is needed
}

Payment.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    transaction_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_transactions', key: 'id' } },
    shop_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_shops', key: 'id' } },
    payer_type: { type: DataTypes.ENUM(...Object.values(PaymentParty)), allowNull: false },
    payee_type: { type: DataTypes.ENUM(...Object.values(PaymentParty)), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(PaymentStatus)), allowNull: false, defaultValue: PaymentStatus.Pending },
    payment_date: { type: DataTypes.DATE, allowNull: true },
    method: { type: DataTypes.ENUM(...Object.values(PaymentMethod)), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    counterparty_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_users', key: 'id' } },

    // Enhanced Settlement Tracking
    settlement_type: { type: DataTypes.ENUM(...Object.values(SettlementType)), allowNull: true, defaultValue: SettlementType.Partial },
    balance_before: { type: DataTypes.DECIMAL(10,2), allowNull: true },
    balance_after: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  applied_to_expenses: { type: DataTypes.DECIMAL(12,2), allowNull: true, defaultValue: 0 },
  applied_to_balance: { type: DataTypes.DECIMAL(12,2), allowNull: true, defaultValue: 0 },
    settled_transactions: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: true },
    settled_expenses: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'kisaan_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // Index for queries by transaction
      { fields: ['transaction_id'] },
      // Index for queries by shop
      { fields: ['shop_id'] },
      // Index for queries by payer type
      { fields: ['payer_type'] },
      // Index for queries by payee type
      { fields: ['payee_type'] },
      // Index for queries by status
      { fields: ['status'] },
      // Index for queries by payment date
      { fields: ['payment_date'] },
      // Index for queries by counterparty
      { fields: ['counterparty_id'] },
      // Composite index for transaction and status
      { fields: ['transaction_id', 'status'] },
      // Composite index for transaction, shop, status, and created_at
      { fields: ['transaction_id', 'shop_id', 'status', 'created_at'] },
    ],
  }
);