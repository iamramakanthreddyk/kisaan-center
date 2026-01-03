

/**
 * SIMPLE FARMER LEDGER - INDEPENDENT COMPONENT
 *
 * ⚠️  IMPORTANT: This is NOT the main accounting ledger system!
 *
 * This table (kisaan_ledger) is an INDEPENDENT, SIMPLIFIED ledger component that:
 * - Provides a user-friendly view for shop owners to track farmer balances
 * - Does NOT have direct foreign key relationships to transactions/payments
 * - Uses text-based references in the 'notes' field (e.g., "Transaction #123")
 * - Is maintained SEPARATELY from the main accounting system
 *
 * DO NOT CONFUSE WITH: kisaan_ledger_entries (the real ERP ledger)
 * - kisaan_ledger_entries HAS proper FK relationships (reference_type, reference_id)
 * - kisaan_ledger_entries is the authoritative source for financial audit trails
 * - TransactionService writes to kisaan_ledger_entries, NOT this table
 *
 * This component exists for UI simplicity and should be maintained independently.
 * Changes to transaction logic should NOT automatically update this table.
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { LEDGER_TYPE_VALUES, LedgerType } from '../constants/ledgerTypes';
import { LEDGER_CATEGORY_VALUES, LedgerCategory } from '../constants/ledgerCategories';

export interface SimpleFarmerLedgerAttributes {
  id: number;
  shop_id: number;
  farmer_id: number;
  amount: number;
  type: LedgerType;
  category: LedgerCategory;
  notes?: string;
  transaction_date?: Date; // Add transaction date field
  created_at?: Date;
  created_by: number;
  commission_amount?: number;
  net_amount?: number;
  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  deletion_reason?: string;
}

export interface SimpleFarmerLedgerCreationAttributes extends Optional<SimpleFarmerLedgerAttributes, 'id' | 'created_at' | 'notes' | 'is_deleted' | 'deleted_at' | 'deleted_by' | 'deletion_reason'> {}





export class SimpleFarmerLedger extends Model<SimpleFarmerLedgerAttributes, SimpleFarmerLedgerCreationAttributes> implements SimpleFarmerLedgerAttributes {
  public id!: number;
  public shop_id!: number;
  public farmer_id!: number;
  public amount!: number;
  public type!: LedgerType;
  public category!: LedgerCategory;
  public notes?: string;
  public transaction_date?: Date; // Add transaction date field
  public created_at?: Date;
  public created_by!: number;
  public commission_amount?: number;
  public net_amount?: number;
  // Soft delete fields
  public is_deleted?: boolean;
  public deleted_at?: Date;
  public deleted_by?: number;
  public deletion_reason?: string;
}

SimpleFarmerLedger.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  shop_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  farmer_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(...LEDGER_TYPE_VALUES),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(...LEDGER_CATEGORY_VALUES),
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  transaction_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  
  commission_amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
  net_amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true,
  },
  // Soft delete fields
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deleted_by: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  deletion_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
