# Payment Balance Fix - Transaction vs Settlement Payments

## Problem Statement

The system was double-counting payments made during transaction creation, causing incorrect balance calculations.

### Issue Description

When creating a transaction with partial payments:
- **Transaction Service** calculates balances by looking at all transactions and their allocated payments
- **Payment Service** was also updating balances for every payment created
- This caused **double deduction** for payments made during transaction creation

### Example of the Bug

**Transaction Created:**
- Farmer Earning: ₹1,209.60
- Payment to Farmer: ₹12.00
- Expected Balance Increase: ₹1,209.60 - ₹12.00 = ₹1,197.60

**What Actually Happened:**
1. Transaction service calculated balance: +₹1,209.60
2. Payment service deducted payment: -₹12.00
3. But this happened BEFORE the transaction service could account for it
4. Result: Balance was incorrect

## Solution

### Key Insight

There are **two types of payments** in the system:

1. **Transaction Payments** - Created as part of a transaction
   - Linked to a `transaction_id`
   - Should NOT trigger separate balance updates
   - Handled by `TransactionService.updateUserBalances()`

2. **Settlement Payments** - Standalone payments to settle outstanding balances
   - NOT linked to any transaction (`transaction_id = null`)
   - SHOULD trigger balance updates
   - Handled by `PaymentService.updateUserBalancesAfterPayment()`

### Implementation

**File: `kisaan-backend-node/src/services/paymentService.ts`**

Added logic to **skip balance updates** for transaction payments:

```typescript
// IMPORTANT: Skip balance updates for payments that are part of transaction creation
// The transaction service's updateUserBalances already accounts for these payments
// Only update balances for standalone settlement payments (no transaction_id)
let balanceResult;
if (!payment.transaction_id) {
  // This is a standalone settlement payment - update balances
  logger.info({ paymentId: payment.id }, 'Processing standalone settlement payment - updating balances');
  balanceResult = await this.updateUserBalancesAfterPayment(payment, options);
} else {
  // This is part of a transaction - skip balance update
  // The transaction's updateUserBalances method will handle this
  logger.info({ paymentId: payment.id, transactionId: payment.transaction_id }, 'Skipping balance update for transaction payment - handled by transaction service');
  balanceResult = { appliedToExpenses: 0, appliedToBalance: 0 };
}
```

**File: `kisaan-backend-node/src/services/transactionService.ts`**

Added clarifying comment:

```typescript
// Calculate new farmer balance: sum of unpaid earnings for all their transactions
// IMPORTANT: This calculation includes ALL payments (both transaction payments and settlement payments)
// via PaymentAllocation records. The PaymentService skips balance updates for transaction payments
// to avoid double-counting.
```

## How It Works Now

### Transaction Creation with Payments

1. **Transaction Created**
   - Farmer earning: ₹1,209.60
   - Payment records created with `transaction_id`
   - Linked via `PaymentAllocation` table

2. **Balance Calculation (TransactionService)**
   - Looks at all farmer transactions
   - For each transaction, calculates: `farmer_earning - sum(allocated_payments)`
   - Accounts for BOTH transaction payments and settlement payments
   - Updates farmer balance to sum of unpaid amounts

3. **Payment Service**
   - Creates payment records
   - Sees `transaction_id` is set
   - **Skips** balance update
   - Returns success

### Standalone Settlement Payment

1. **Payment Created**
   - No `transaction_id` (null)
   - This is a settlement payment

2. **Payment Service**
   - Creates payment record
   - Sees `transaction_id` is null
   - **Processes** balance update
   - Applies FIFO expense settlement (for farmers)
   - Reduces outstanding balance

## Testing

### Test Case 1: Transaction with Partial Payment

```json
{
  "quantity": 12,
  "unit_price": 112,
  "commission_rate": 10,
  "payments": [
    {
      "payer_type": "buyer",
      "payee_type": "shop",
      "amount": 13
    },
    {
      "payer_type": "shop",
      "payee_type": "farmer",
      "amount": 12
    }
  ]
}
```

**Expected Result:**
- Transaction created successfully
- Farmer balance increases by: ₹1,209.60 - ₹12.00 = ₹1,197.60
- Buyer balance increases by: ₹1,344.00 - ₹13.00 = ₹1,331.00
- No double-counting

### Test Case 2: Standalone Settlement Payment

```json
{
  "payer_type": "shop",
  "payee_type": "farmer",
  "amount": 500,
  "transaction_id": null
}
```

**Expected Result:**
- Payment created successfully
- Farmer balance reduced by ₹500
- FIFO expense settlement applied
- Balance snapshot created

## Benefits

1. ✅ **No Double-Counting** - Transaction payments don't affect balance twice
2. ✅ **Clear Separation** - Transaction payments vs settlement payments are distinct
3. ✅ **Accurate Balances** - Balance reflects actual outstanding amounts
4. ✅ **FIFO Support** - Settlement payments still apply FIFO expense logic
5. ✅ **Audit Trail** - All payments tracked, but balance updates are correct

## Migration Notes

**Existing Data:**
- If you have existing incorrect balances, you may need to recalculate them
- Run the transaction service's `updateUserBalances` for all users to fix balances
- Or reset balances to 0 and recreate from transaction history

**Going Forward:**
- All new transactions with payments will work correctly
- Standalone settlement payments will continue to work as before

## Related Files

- `kisaan-backend-node/src/services/paymentService.ts` - Payment creation and balance updates ✅ FIXED
- `kisaan-backend-node/src/services/transactionService.ts` - Transaction creation and balance calculation ✅ FIXED
- `kisaan-backend-node/src/schemas/transaction.ts` - Transaction validation schema ✅ FIXED
- `kisaan-backend-node/src/models/paymentAllocation.ts` - Links payments to transactions
- `kisaan-backend-node/src/models/balanceSnapshot.ts` - Audit trail for balance changes

## Complete List of Changes

### 1. Payment Service (`paymentService.ts`)
**Line ~149**: Added logic to skip balance updates for transaction payments
```typescript
if (!payment.transaction_id) {
  // Standalone settlement payment - update balances
  balanceResult = await this.updateUserBalancesAfterPayment(payment, options);
} else {
  // Transaction payment - skip balance update
  balanceResult = { appliedToExpenses: 0, appliedToBalance: 0 };
}
```

### 2. Transaction Service - Farmer Balance (`transactionService.ts`)
**Line ~1555**: Added clarifying comments for farmer balance calculation
```typescript
// IMPORTANT: This calculation includes ALL payments (both transaction payments and settlement payments)
// via PaymentAllocation records. The PaymentService skips balance updates for transaction payments
// to avoid double-counting.
```

### 3. Transaction Service - Buyer Balance (`transactionService.ts`) 
**Line ~1585**: Replaced simple buyer balance logic with proper payment-aware calculation
```typescript
// OLD (WRONG):
const newBuyerBalance = transactionStatus === TRANSACTION_STATUS.PENDING
  ? currentBuyerBalance + Number(totalAmount)
  : currentBuyerBalance;

// NEW (CORRECT):
const allBuyerTxns = await this.transactionRepository.findByBuyer(buyer.id!);
const buyerTxnIds = allBuyerTxns.map(t => t.id).filter((id): id is number => typeof id === 'number');
const buyerAllocations = await (await import('../models/paymentAllocation')).PaymentAllocation.findAll({ 
  where: { transaction_id: { [Op.in]: buyerTxnIds } } 
});
const buyerPayments = await (await import('../models/payment')).Payment.findAll({ 
  where: { transaction_id: { [Op.in]: buyerTxnIds } } 
});

const newBuyerBalance = allBuyerTxns.reduce((sum, t) => {
  const paidByBuyer = buyerAllocations
    .filter(a => a.transaction_id === t.id)
    .map(a => {
      const payment = buyerPayments.find(p => p.id === a.payment_id);
      if (payment && payment.payer_type === PARTY_TYPE.BUYER && payment.status === PAYMENT_STATUS.PAID) {
        return Number(a.allocated_amount || 0);
      }
      return 0;
    })
    .reduce((s, v) => s + v, 0);
  const unpaid = Math.max(Number(t.total_amount || 0) - paidByBuyer, 0);
  return sum + unpaid;
}, 0);
```

### 4. Transaction Schema (`transaction.ts`)
**Lines ~17-38**: Added preprocessing to normalize payment types and methods
```typescript
payments: z.array(z.object({
  payer_type: z.preprocess(
    (val) => typeof val === 'string' ? val.toUpperCase() : val,
    z.enum(['BUYER', 'SHOP'])
  ),
  payee_type: z.preprocess(
    (val) => typeof val === 'string' ? val.toUpperCase() : val,
    z.enum(['SHOP', 'FARMER'])
  ),
  // ... method and status also normalized
}))
```

## Cumulative Value Tracking

**Both farmer and buyer `cumulative_value` fields are correctly tracked:**

```typescript
// Line ~1552-1553 in transactionService.ts
const newFarmerCumulative = currentFarmerCumulative + Number(farmerEarning);
const newBuyerCumulative = currentBuyerCumulative + Number(totalAmount);
```

- **Farmer cumulative_value**: Tracks lifetime earnings (sum of all farmer_earning from all transactions)
- **Buyer cumulative_value**: Tracks lifetime spending (sum of all total_amount from all transactions)
- These values are **always incremented** regardless of payment status
- **Balance** = What is currently owed (unpaid amount)
- **Cumulative** = Total historical value (lifetime earning/spending)

## Date

October 19, 2025
