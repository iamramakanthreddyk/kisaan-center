import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TransactionLedgerAttributes {
  id: number;
  transaction_id?: number | null;
  user_id: number;
  role: string;
  delta_amount: number;
  balance_before?: number | null;
  balance_after?: number | null;
  reason_code: string;
  created_at?: Date;
}

export type TransactionLedgerCreation = Optional<TransactionLedgerAttributes, 'id' | 'transaction_id' | 'balance_before' | 'balance_after' | 'created_at'>;

export class TransactionLedger extends Model<TransactionLedgerAttributes, TransactionLedgerCreation> implements TransactionLedgerAttributes {
  public id!: number;
  public transaction_id?: number | null;
  public user_id!: number;
  public role!: string;
  public delta_amount!: number;
  public balance_before?: number | null;
  public balance_after?: number | null;
  public reason_code!: string;
  public created_at?: Date;
}

TransactionLedger.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  transaction_id: { type: DataTypes.BIGINT, allowNull: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false },
  delta_amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  balance_before: { type: DataTypes.DECIMAL(12,2), allowNull: true },
  balance_after: { type: DataTypes.DECIMAL(12,2), allowNull: true },
  reason_code: { type: DataTypes.STRING(40), allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  tableName: 'kisaan_transaction_ledger',
  timestamps: false
});
