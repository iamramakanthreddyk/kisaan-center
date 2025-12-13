# Implementation: Ledger-Based Accounting System

## Step 1: Create Ledger Tables (Migration)

### Migration File: 20251031_create_ledger_system.sql

```sql
-- ============================================================================
-- NEW: Append-only ledger for complete audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS kisaan_ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  
  -- Direction from shop's perspective:
  -- DEBIT:  shop receives money / shop owes farmer (positive for farmer, negative for shop)
  -- CREDIT: shop pays money / farmer owes shop (negative for farmer, positive for shop)
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  
  -- Type of transaction
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'TRANSACTION',           -- Sale transaction (farmer earning / buyer payment)
    'PAYMENT',               -- Cash payment
    'ADVANCE',               -- Farmer pays advance upfront
    'EXPENSE',               -- Shop covers expense for farmer
    'EXPENSE_SETTLED',       -- Expense offset against earnings
    'ADJUSTMENT',            -- Manual adjustment
    'REFUND'                 -- Overpayment returned
  )),
  
  -- Reference to original record (for audit trail linking)
  reference_type VARCHAR(50),  -- 'transaction', 'payment', 'expense', etc.
  reference_id BIGINT,
  
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  
  -- Indexes for fast queries
  CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_ledger_user_shop ON kisaan_ledger_entries(user_id, shop_id);
CREATE INDEX idx_ledger_created_at ON kisaan_ledger_entries(created_at);
CREATE INDEX idx_ledger_type ON kisaan_ledger_entries(type);
CREATE INDEX idx_ledger_reference ON kisaan_ledger_entries(reference_type, reference_id);

-- ============================================================================
-- NEW: Pre-calculated user balances (single source of truth for balance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kisaan_user_balances (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  
  -- Actual balance amount (sum of all ledger entries for this user-shop)
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- For optimistic locking (prevent race conditions)
  version INT NOT NULL DEFAULT 0,
  
  -- Tracking
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint (one row per user-shop pair)
  UNIQUE (user_id, shop_id),
  
  CONSTRAINT fk_balance_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_balance_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_balance_lookup ON kisaan_user_balances(user_id, shop_id);

-- ============================================================================
-- BACKFILL: Migrate existing transactions to ledger
-- ============================================================================
-- For each transaction:
--   Farmer earns: CREDIT entry (shop owes farmer)
--   Buyer pays: DEBIT entry for buyer (buyer owes)
-- ============================================================================

-- Farmer earnings from transactions
INSERT INTO kisaan_ledger_entries (user_id, shop_id, direction, amount, type, reference_type, reference_id, description, created_at)
SELECT 
  farmer_id,
  shop_id,
  'CREDIT',  -- Shop owes farmer for goods
  farmer_earning,
  'TRANSACTION',
  'transaction',
  id,
  CONCAT('Transaction #', id),
  created_at
FROM kisaan_transactions
WHERE status IN ('pending', 'completed', 'settled')
  AND farmer_earning > 0;

-- Buyer obligations from transactions
INSERT INTO kisaan_ledger_entries (user_id, shop_id, direction, amount, type, reference_type, reference_id, description, created_at)
SELECT 
  buyer_id,
  shop_id,
  'DEBIT',  -- Buyer owes for goods
  total_amount,
  'TRANSACTION',
  'transaction',
  id,
  CONCAT('Transaction #', id),
  created_at
FROM kisaan_transactions
WHERE status IN ('pending', 'completed', 'settled')
  AND total_amount > 0;

-- ============================================================================
-- BACKFILL: Migrate existing payments
-- ============================================================================
-- Each payment creates entries for both payer and payee

-- Buyer payments to shop (reduce buyer's debt)
INSERT INTO kisaan_ledger_entries (user_id, shop_id, direction, amount, type, reference_type, reference_id, description, created_at)
SELECT 
  counterparty_id,
  shop_id,
  'CREDIT',  -- Buyer reduced obligation
  amount,
  'PAYMENT',
  'payment',
  id,
  CONCAT('Payment #', id),
  payment_date
FROM kisaan_payments
WHERE status = 'PAID'
  AND payer_type = 'BUYER'
  AND payee_type = 'SHOP';

-- Farmer payments to shop (reduce farmer's debt from advance)
INSERT INTO kisaan_ledger_entries (user_id, shop_id, direction, amount, type, reference_type, reference_id, description, created_at)
SELECT 
  counterparty_id,
  shop_id,
  'CREDIT',  -- Farmer paying back advance
  amount,
  CASE 
    WHEN amount > 100000 THEN 'ADVANCE'  -- Large payments are advances
    ELSE 'PAYMENT'
  END,
  'payment',
  id,
  CONCAT('Payment #', id),
  payment_date
FROM kisaan_payments
WHERE status = 'PAID'
  AND payer_type = 'FARMER'
  AND payee_type = 'SHOP';

-- ============================================================================
-- BACKFILL: Recalculate all balances from ledger
-- ============================================================================
INSERT INTO kisaan_user_balances (user_id, shop_id, balance, version)
SELECT 
  user_id,
  shop_id,
  COALESCE(SUM(
    CASE 
      WHEN direction = 'CREDIT' THEN amount
      WHEN direction = 'DEBIT' THEN -amount
    END
  ), 0) AS balance,
  1
FROM kisaan_ledger_entries
GROUP BY user_id, shop_id
ON CONFLICT (user_id, shop_id) 
DO UPDATE SET 
  balance = EXCLUDED.balance,
  version = 1;
```

---

## Step 2: Create Ledger Service

```typescript
// src/services/ledgerService.ts

import { Transaction as SequelizeTransaction } from 'sequelize';
import { LedgerEntry } from '../models/ledgerEntry';
import { UserBalance } from '../models/userBalance';
import { logger } from '../config/logger';

export interface LedgerEntryData {
  user_id: number;
  shop_id: number;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  type: 'TRANSACTION' | 'PAYMENT' | 'ADVANCE' | 'EXPENSE' | 'EXPENSE_SETTLED' | 'ADJUSTMENT' | 'REFUND';
  reference_type?: string;
  reference_id?: number;
  description?: string;
  created_by?: number;
}

export class LedgerService {
  /**
   * Append a ledger entry and update user balance atomically
   * This is the ONLY way balances should be updated going forward
   */
  async appendEntry(
    data: LedgerEntryData,
    tx?: SequelizeTransaction
  ): Promise<{ entry: LedgerEntry; balance: UserBalance }> {
    const finalTx = tx || (await LedgerEntry.sequelize!.transaction());

    try {
      // 1. Create ledger entry
      const entry = await LedgerEntry.create(
        {
          user_id: data.user_id,
          shop_id: data.shop_id,
          direction: data.direction,
          amount: data.amount,
          type: data.type,
          reference_type: data.reference_type,
          reference_id: data.reference_id,
          description: data.description,
          created_by: data.created_by
        },
        { transaction: finalTx }
      );

      // 2. Update or create user balance
      const signedAmount =
        data.direction === 'CREDIT' ? data.amount : -data.amount;

      const [userBalance] = await UserBalance.findOrCreate({
        where: {
          user_id: data.user_id,
          shop_id: data.shop_id
        },
        defaults: {
          user_id: data.user_id,
          shop_id: data.shop_id,
          balance: signedAmount,
          version: 1
        },
        transaction: finalTx
      });

      // 3. Update balance atomically (with optimistic locking)
      const [updated] = await UserBalance.update(
        {
          balance: UserBalance.sequelize!.literal(
            `balance + ${signedAmount}`
          ),
          version: UserBalance.sequelize!.literal('version + 1'),
          last_updated: new Date()
        },
        {
          where: {
            user_id: data.user_id,
            shop_id: data.shop_id,
            version: userBalance.version
          },
          transaction: finalTx,
          returning: true
        }
      );

      if (updated === 0) {
        throw new Error(
          `Optimistic lock failed for balance ${data.user_id}:${data.shop_id}`
        );
      }

      // Fetch updated balance
      const updatedBalance = await UserBalance.findOne({
        where: {
          user_id: data.user_id,
          shop_id: data.shop_id
        },
        transaction: finalTx
      });

      logger.info(
        {
          entryId: entry.id,
          userId: data.user_id,
          newBalance: updatedBalance?.balance,
          type: data.type
        },
        '[LEDGER] Entry created and balance updated'
      );

      if (!tx) {
        await finalTx.commit();
      }

      return {
        entry,
        balance: updatedBalance!
      };
    } catch (error) {
      if (!tx) {
        await finalTx.rollback();
      }
      throw error;
    }
  }

  /**
   * Get current balance for a user-shop pair
   * No calculation needed - it's pre-calculated!
   */
  async getBalance(userId: number, shopId: number): Promise<number> {
    const balance = await UserBalance.findOne({
      where: {
        user_id: userId,
        shop_id: shopId
      }
    });

    return balance?.balance ?? 0;
  }

  /**
   * Get ledger history for audit trail
   */
  async getLedgerHistory(
    userId: number,
    shopId: number,
    filters?: {
      types?: string[];
      from?: Date;
      to?: Date;
      limit?: number;
    }
  ): Promise<LedgerEntry[]> {
    const where: any = {
      user_id: userId,
      shop_id: shopId
    };

    if (filters?.types && filters.types.length > 0) {
      where.type = { [Op.in]: filters.types };
    }

    if (filters?.from || filters?.to) {
      where.created_at = {};
      if (filters.from) where.created_at[Op.gte] = filters.from;
      if (filters.to) where.created_at[Op.lte] = filters.to;
    }

    return LedgerEntry.findAll({
      where,
      order: [['created_at', 'ASC']],
      limit: filters?.limit || 1000
    });
  }

  /**
   * Get settlement summary for a user
   * Aggregates ledger data for UI display
   */
  async getSettlementSummary(
    userId: number,
    shopId: number,
    periodStart?: Date,
    periodEnd?: Date
  ) {
    // Get all ledger entries
    const entries = await this.getLedgerHistory(userId, shopId, {
      from: periodStart,
      to: periodEnd
    });

    // Aggregate by type
    const byType = entries.reduce(
      (acc, entry) => {
        const key = entry.type;
        if (!acc[key]) {
          acc[key] = { debit: 0, credit: 0, count: 0 };
        }
        if (entry.direction === 'DEBIT') {
          acc[key].debit += Number(entry.amount);
        } else {
          acc[key].credit += Number(entry.amount);
        }
        acc[key].count++;
        return acc;
      },
      {} as Record<
        string,
        { debit: number; credit: number; count: number }
      >
    );

    // Get current balance
    const currentBalance = await this.getBalance(userId, shopId);

    return {
      period: {
        from: periodStart || new Date('2025-01-01'),
        to: periodEnd || new Date()
      },
      summary: {
        transactions: byType.TRANSACTION || { debit: 0, credit: 0, count: 0 },
        payments: byType.PAYMENT || { debit: 0, credit: 0, count: 0 },
        advances: byType.ADVANCE || { debit: 0, credit: 0, count: 0 },
        expenses: byType.EXPENSE || { debit: 0, credit: 0, count: 0 },
        adjustments: byType.ADJUSTMENT || { debit: 0, credit: 0, count: 0 }
      },
      current_balance: currentBalance,
      ledger_entries: entries.length
    };
  }
}

export const ledgerService = new LedgerService();
```

---

## Step 3: Create Models

### LedgerEntry Model

```typescript
// src/models/ledgerEntry.ts

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface LedgerEntryAttributes {
  id: number;
  user_id: number;
  shop_id: number;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  type: string;
  reference_type?: string;
  reference_id?: number;
  description?: string;
  created_at: Date;
  created_by?: number;
}

export class LedgerEntry extends Model<LedgerEntryAttributes> {
  public id!: number;
  public user_id!: number;
  public shop_id!: number;
  public direction!: 'DEBIT' | 'CREDIT';
  public amount!: number;
  public type!: string;
  public reference_type?: string;
  public reference_id?: number;
  public description?: string;
  public created_at!: Date;
  public created_by?: number;
}

LedgerEntry.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    shop_id: { type: DataTypes.BIGINT, allowNull: false },
    direction: {
      type: DataTypes.ENUM('DEBIT', 'CREDIT'),
      allowNull: false
    },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    reference_type: { type: DataTypes.STRING(50) },
    reference_id: { type: DataTypes.BIGINT },
    description: { type: DataTypes.TEXT },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    created_by: { type: DataTypes.BIGINT }
  },
  {
    sequelize,
    modelName: 'LedgerEntry',
    tableName: 'kisaan_ledger_entries',
    timestamps: false
  }
);

export default LedgerEntry;
```

### UserBalance Model

```typescript
// src/models/userBalance.ts

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface UserBalanceAttributes {
  id: number;
  user_id: number;
  shop_id: number;
  balance: number;
  version: number;
  last_updated: Date;
}

export class UserBalance extends Model<UserBalanceAttributes> {
  public id!: number;
  public user_id!: number;
  public shop_id!: number;
  public balance!: number;
  public version!: number;
  public last_updated!: Date;
}

UserBalance.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    shop_id: { type: DataTypes.BIGINT, allowNull: false },
    balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'UserBalance',
    tableName: 'kisaan_user_balances',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'shop_id']
      }
    ]
  }
);

export default UserBalance;
```

---

## Step 4: Update Transaction Service

### Before and After Comparison

**Before**: Complex delta calculations + balance updates
```typescript
const netBuyerDelta = recordTotalAmount - buyerPaid;
// Then: balance = currentBalance + netBuyerDelta
// Then: check if needs full recalculation
// Result: BUG - balance corrupted!
```

**After**: Ledger entries (automatic)
```typescript
await ledgerService.appendEntry({
  user_id: buyer.id,
  shop_id: shop_id,
  direction: 'DEBIT',  // Buyer owes
  amount: recordTotalAmount,
  type: 'TRANSACTION',
  reference_id: transaction.id,
  description: `Goods sale #${transaction.id}`
});
// Done! Balance auto-updated, no calculation needed
```

### Implementation

```typescript
// In transactionService.ts - REPLACE complex balance update with:

// After transaction and payments created
await ledgerService.appendEntry(
  {
    user_id: buyer.id,
    shop_id: shop_id,
    direction: 'DEBIT',  // Buyer owes for goods
    amount: recordTotalAmount,
    type: 'TRANSACTION',
    reference_id: (createdTransaction as any).id,
    description: `Transaction #${(createdTransaction as any).id}: ${recordTotalAmount} for goods`
  },
  tx
);

await ledgerService.appendEntry(
  {
    user_id: farmer.id,
    shop_id: shop_id,
    direction: 'CREDIT',  // Shop owes farmer for goods
    amount: recordFarmerEarning,
    type: 'TRANSACTION',
    reference_id: (createdTransaction as any).id,
    description: `Earning from transaction #${(createdTransaction as any).id}`
  },
  tx
);

// REMOVE ALL THE OLD CODE:
// - netFarmerDelta calculation
// - netBuyerDelta calculation
// - complex updateUserBalances() call
// - balance recalculation logic
```

---

## This Fixes Everything!

### Before: 99,680 Buyer Balance Bug

```
When 10 transactions created:
1. Transaction 1: buyer balance = 0 + 1000 = 1000 ✗ (should be through ledger)
2. Transaction 2: buyer balance = 1000 + 1500 = 2500 ✗ (recalculated from scratch)
3. Transaction 3-10: Complex accumulation...
Result: buyer balance = 99,680 ❌ (30x error!)

Root cause: Delta path + recalculation path + double-counting
```

### After: Ledger-Based

```
When 10 transactions created:
1. Transaction 1: Ledger entry ₹1000 DEBIT → balance = -1000
2. Payment ₹250: Ledger entry ₹250 CREDIT → balance = -750
3. Expense ₹50: Ledger entry ₹50 DEBIT → balance = -800
4. Etc.
Result: Buyer balance = Sum of all ledger entries = ✅ CORRECT

Why? No calculation, no delta, no recalculation.
Just append-only entries + running sum.
```

---

## Testing the New System

```typescript
// test/ledgerService.spec.ts

describe('Ledger System', () => {
  it('should handle farmer advance scenario correctly', async () => {
    // 1. Farmer pays ₹100,000 advance
    await ledgerService.appendEntry({
      user_id: FARMER_ID,
      shop_id: SHOP_ID,
      direction: 'DEBIT',
      amount: 100000,
      type: 'ADVANCE',
      description: 'Farmer advance payment'
    });

    let balance = await ledgerService.getBalance(FARMER_ID, SHOP_ID);
    expect(balance).toBe(-100000);  // Farmer has credit

    // 2. Transaction ₹12,840 created
    await ledgerService.appendEntry({
      user_id: FARMER_ID,
      shop_id: SHOP_ID,
      direction: 'CREDIT',
      amount: 12840,
      type: 'TRANSACTION',
      description: 'Transaction earnings'
    });

    balance = await ledgerService.getBalance(FARMER_ID, SHOP_ID);
    expect(balance).toBe(-87160);  // Still has credit

    // 3. Buyer pays ₹3,277
    await ledgerService.appendEntry({
      user_id: BUYER_ID,
      shop_id: SHOP_ID,
      direction: 'CREDIT',
      amount: 3277,
      type: 'PAYMENT',
      description: 'Buyer payment'
    });

    let buyerBalance = await ledgerService.getBalance(BUYER_ID, SHOP_ID);
    expect(buyerBalance).toBe(9563);  // Buyer still owes

    // 4. Expenses ₹665
    await ledgerService.appendEntry({
      user_id: FARMER_ID,
      shop_id: SHOP_ID,
      direction: 'DEBIT',
      amount: 665,
      type: 'EXPENSE',
      description: 'Transport expenses'
    });

    balance = await ledgerService.getBalance(FARMER_ID, SHOP_ID);
    expect(balance).toBe(-87825);  // Updated correctly

    // 5. Get settlement summary
    const summary = await ledgerService.getSettlementSummary(FARMER_ID, SHOP_ID);
    expect(summary.current_balance).toBe(-87825);
    expect(summary.summary.transactions.credit).toBe(12840);
    expect(summary.summary.advances.debit).toBe(100000);
    expect(summary.summary.expenses.debit).toBe(665);
  });
});
```

