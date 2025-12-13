# Quick Start: Implement Ledger System (5 Days)

## Day 1: Setup Tables & Backfill

### Step 1a: Run Migration
```bash
# In migrations folder, create: 20251031_ledger_system.sql
psql "$DATABASE_URL" -f migrations/20251031_ledger_system.sql
```

### Step 1b: Verify Tables Created
```bash
psql "$DATABASE_URL" -c "\dt kisaan_ledger* kisaan_user_balance*"
```

**Expected Output:**
```
                    List of relations
 Schema |           Name            | Type  | Owner
--------+---------------------------+-------+-------
 public | kisaan_ledger_entries     | table | postgres
 public | kisaan_user_balances      | table | postgres
```

---

## Day 2: Create Services & Models

### Step 2a: Create LedgerEntry Model
```typescript
// File: src/models/ledgerEntry.ts
// Copy from LEDGER_IMPLEMENTATION.md → Step 3 → LedgerEntry Model
```

### Step 2b: Create UserBalance Model
```typescript
// File: src/models/userBalance.ts
// Copy from LEDGER_IMPLEMENTATION.md → Step 3 → UserBalance Model
```

### Step 2c: Create LedgerService
```typescript
// File: src/services/ledgerService.ts
// Copy from LEDGER_IMPLEMENTATION.md → Step 2
```

### Step 2d: Test Service
```bash
npm run test -- src/services/ledgerService.spec.ts
```

---

## Day 3: Update Payment & Transaction Services

### Step 3a: Update TransactionService.createTransaction()

**Find this code** (around line 865):
```typescript
await this.updateUserBalances(farmer, buyer, netFarmerDelta, netBuyerDelta, ...);
```

**Replace with:**
```typescript
// REMOVE: All the old updateUserBalances calls

// ADD: New ledger entries
const { ledgerService } = await import('./ledgerService');

// Create buyer obligation (DEBIT - buyer owes shop)
await ledgerService.appendEntry({
  user_id: buyer.id!,
  shop_id: data.shop_id,
  direction: 'DEBIT',
  amount: recordTotalAmount,
  type: 'TRANSACTION',
  reference_type: 'transaction',
  reference_id: (createdTransaction as any).id,
  description: `Transaction #${(createdTransaction as any).id}`
}, tx);

// Create farmer earning (CREDIT - shop owes farmer)
await ledgerService.appendEntry({
  user_id: farmer.id!,
  shop_id: data.shop_id,
  direction: 'CREDIT',
  amount: recordFarmerEarning,
  type: 'TRANSACTION',
  reference_type: 'transaction',
  reference_id: (createdTransaction as any).id,
  description: `Earning from #${(createdTransaction as any).id}`
}, tx);
```

### Step 3b: Update PaymentService.createPayment()

**Find this code** (around line 210):
```typescript
if (!payment.transaction_id) {
  // ... complex balance update logic ...
  balanceResult = await this.updateUserBalancesAfterPayment(payment, options);
}
```

**Replace entire block with:**
```typescript
const { ledgerService } = await import('./ledgerService');

if (!payment.transaction_id) {
  // Standalone payment - append ledger entry
  
  if (payment.payer_type === PARTY_TYPE.BUYER && payment.payee_type === PARTY_TYPE.SHOP) {
    // Buyer payment reduces their debt
    await ledgerService.appendEntry({
      user_id: payment.counterparty_id!,
      shop_id: payment.shop_id!,
      direction: 'CREDIT',  // Reduces debt
      amount: payment.amount as number,
      type: 'PAYMENT',
      reference_type: 'payment',
      reference_id: payment.id,
      description: `Payment #${payment.id}`
    }, options?.tx);
  } else if (payment.payer_type === PARTY_TYPE.FARMER && payment.payee_type === PARTY_TYPE.SHOP) {
    // Farmer payment (could be advance or settling)
    await ledgerService.appendEntry({
      user_id: payment.counterparty_id!,
      shop_id: payment.shop_id!,
      direction: 'CREDIT',  // Reduces farmer's debt/advance
      amount: payment.amount as number,
      type: payment.amount > 50000 ? 'ADVANCE' : 'PAYMENT',
      reference_type: 'payment',
      reference_id: payment.id,
      description: `Payment #${payment.id}`
    }, options?.tx);
  }
  
  balanceResult = { appliedToExpenses: 0, appliedToBalance: payment.amount as number };
} else {
  // Transaction-linked payment - already handled by transaction creation
  balanceResult = { appliedToExpenses: 0, appliedToBalance: 0 };
}
```

### Step 3c: Update ExpenseService.createExpense()

**Find expense creation code** and add:
```typescript
const { ledgerService } = await import('./ledgerService');

// After expense created, append ledger entry
await ledgerService.appendEntry({
  user_id: expense.user_id,
  shop_id: expense.shop_id!,
  direction: 'DEBIT',  // Farmer owes for expense
  amount: expense.amount,
  type: 'EXPENSE',
  reference_type: 'expense',
  reference_id: expense.id,
  description: `${expense.category}: ${expense.description}`
}, tx);
```

---

## Day 4: Create/Update Endpoints

### Step 4a: New GET /balance Endpoint

```typescript
// File: src/routes/balanceRoutes.ts (NEW)

import express from 'express';
import { ledgerService } from '../services/ledgerService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * GET /balance/:userId/:shopId
 * Get current balance (no recalculation needed!)
 */
router.get('/balance/:userId/:shopId', authMiddleware, async (req, res) => {
  try {
    const { userId, shopId } = req.params;
    
    const balance = await ledgerService.getBalance(
      Number(userId),
      Number(shopId)
    );
    
    res.json({
      data: {
        user_id: Number(userId),
        shop_id: Number(shopId),
        balance: balance,
        as_of: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /ledger/:userId/:shopId
 * Get ledger history for audit trail
 */
router.get('/ledger/:userId/:shopId', authMiddleware, async (req, res) => {
  try {
    const { userId, shopId } = req.params;
    const { from, to, types, limit } = req.query;
    
    const entries = await ledgerService.getLedgerHistory(
      Number(userId),
      Number(shopId),
      {
        types: types ? String(types).split(',') : undefined,
        from: from ? new Date(String(from)) : undefined,
        to: to ? new Date(String(to)) : undefined,
        limit: limit ? Number(limit) : 100
      }
    );
    
    res.json({
      data: entries,
      count: entries.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /settlement-summary/:userId/:shopId
 * Get detailed settlement breakdown for UI
 */
router.get('/settlement-summary/:userId/:shopId', authMiddleware, async (req, res) => {
  try {
    const { userId, shopId } = req.params;
    const { from, to } = req.query;
    
    const summary = await ledgerService.getSettlementSummary(
      Number(userId),
      Number(shopId),
      from ? new Date(String(from)) : undefined,
      to ? new Date(String(to)) : undefined
    );
    
    res.json({ data: summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Step 4b: Register Route
```typescript
// In app.ts or routes/index.ts
import balanceRoutes from './routes/balanceRoutes';
app.use('/api', balanceRoutes);
```

---

## Day 5: Test Everything

### Step 5a: Run Migration Backfill
```bash
npm run migrate
```

### Step 5b: Test Transaction Creation
```bash
curl -X POST http://localhost:8000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_id": 1,
    "farmer_id": 5,
    "buyer_id": 3,
    "quantity": 10,
    "unit_price": 100
  }'
```

### Step 5c: Check Ledger Entries Created
```bash
curl http://localhost:8000/api/ledger/3/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "type": "TRANSACTION",
      "direction": "DEBIT",
      "amount": 1000,
      "description": "Transaction #123"
    }
  ]
}
```

### Step 5d: Check Balance Updated
```bash
curl http://localhost:8000/api/balance/3/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "data": {
    "user_id": 3,
    "shop_id": 1,
    "balance": -1000,
    "as_of": "2025-10-31T12:34:56.000Z"
  }
}
```

### Step 5e: Test Settlement Summary
```bash
curl http://localhost:8000/api/settlement-summary/5/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "data": {
    "period": { "from": "2025-01-01", "to": "2025-10-31" },
    "summary": {
      "transactions": { "debit": 0, "credit": 950, "count": 1 },
      "payments": { "debit": 0, "credit": 300, "count": 1 },
      "advances": { "debit": 100000, "credit": 0, "count": 1 },
      "expenses": { "debit": 50, "credit": 0, "count": 1 },
      "adjustments": { "debit": 0, "credit": 0, "count": 0 }
    },
    "current_balance": -99700,
    "ledger_entries": 4
  }
}
```

### Step 5f: Run Comprehensive Tests
```bash
# Test advance scenario
npm run test -- advanced-advance-scenario.test.ts

# Test partial payments
npm run test -- partial-payment-scenario.test.ts

# Test expenses
npm run test -- expense-scenario.test.ts

# All tests
npm run test
```

---

## Checklist

- [ ] Day 1: Tables created and backfilled
- [ ] Day 2: Models and service created
- [ ] Day 3: PaymentService and TransactionService updated
- [ ] Day 4: New endpoints created and registered
- [ ] Day 5: All tests passing
- [ ] Verify: Buyer balance now shows correct value (not 99,680)
- [ ] Remove: Old balance calculation code
- [ ] Deploy: To production
- [ ] Monitor: No errors, balances correct

---

## Verification Queries

### Verify Migration Successful
```sql
SELECT COUNT(*) FROM kisaan_ledger_entries;
SELECT COUNT(*) FROM kisaan_user_balances;
```

### Verify Data Backfilled
```sql
SELECT 
  type, 
  COUNT(*) as count,
  SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) as net
FROM kisaan_ledger_entries
GROUP BY type;
```

### Verify Balances Match
```sql
-- Check if any user has balance discrepancy
SELECT 
  ub.user_id,
  ub.shop_id,
  ub.balance,
  SUM(CASE 
    WHEN le.direction='CREDIT' THEN le.amount 
    ELSE -le.amount 
  END) as ledger_sum,
  CASE 
    WHEN ABS(ub.balance - SUM(CASE WHEN le.direction='CREDIT' THEN le.amount ELSE -le.amount END)) > 0.01 
    THEN 'MISMATCH ⚠️'
    ELSE 'OK ✓'
  END as status
FROM kisaan_user_balances ub
LEFT JOIN kisaan_ledger_entries le ON le.user_id = ub.user_id AND le.shop_id = ub.shop_id
GROUP BY ub.user_id, ub.shop_id, ub.balance
ORDER BY status DESC;
```

---

## Rollback Plan (If Needed)

```bash
# If something goes wrong, restore old system
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS kisaan_ledger_entries;"
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS kisaan_user_balances;"

# Revert code changes
git checkout src/services/paymentService.ts
git checkout src/services/transactionService.ts
git checkout src/services/expenseService.ts

# Restart backend
npm run dev
```

---

## Success Criteria

✅ Ledger tables created with data backfilled
✅ LedgerService working (append entries, update balance)
✅ PaymentService writes ledger entries (no old balance code)
✅ TransactionService writes ledger entries (no deltas)
✅ GET /balance returns correct balance (not 99,680)
✅ GET /ledger shows complete history
✅ GET /settlement-summary shows accurate breakdown
✅ All 10 transactions in complex-settlement-test have correct balances
✅ Zero errors in production logs
✅ Response times improved (balance queries faster)

**Once all ✅, you have a production-ready system!**

