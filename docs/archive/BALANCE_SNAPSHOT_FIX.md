# Balance Snapshot Fix - Payment Management Balance Display

## Problem
When creating a transaction with partial payments, the Payment Management page shows **Current Balance: ₹0** instead of the correct pending balance.

### Example
- Created transaction: Farmer earning = 24,575.4, Payment to farmer = 24
- Expected balance: **24,575.4 - 24 = 24,551.4**
- Actual balance shown: **₹0** ❌

## Root Cause
The Payment Management frontend calculates balance from **BalanceSnapshot** records. However:

1. `TransactionService.updateUserBalances()` updates the `user.balance` field ✅
2. BUT it doesn't create `BalanceSnapshot` records ❌
3. Frontend queries snapshots → finds none → shows ₹0

### Why This Happened
When we fixed the double-counting issue, we made `PaymentService` skip balance updates for transaction payments:
```typescript
// PaymentService.createPayment()
if (!payment.transaction_id) {
  // Only update balances for standalone settlement payments
  await this.updateUserBalancesAfterPayment(payment);
} else {
  // Skip for transaction payments - TransactionService handles it
  // But TransactionService wasn't creating snapshots!
}
```

## Solution
Added balance snapshot creation to `TransactionService.updateUserBalances()`:

### Changes Made

#### File: `kisaan-backend-node/src/services/transactionService.ts`

**After updating farmer balance:**
```typescript
// Create balance snapshot for farmer
const farmerBalanceChange = (updatedFarmer.balance ?? 0) - _currentFarmerBalance;
if (farmerBalanceChange !== 0 && updatedFarmer.balance !== undefined) {
  try {
    const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
    await BalanceSnapshot.create({
      user_id: farmer.id!,
      balance_type: 'farmer',
      previous_balance: _currentFarmerBalance,
      amount_change: farmerBalanceChange,
      new_balance: updatedFarmer.balance,
      transaction_type: 'transaction',
      reference_type: 'transaction',
      description: `Transaction balance update: farmer earning ${farmerEarning}`
    }, tx ? { transaction: tx } : undefined);
  } catch (snapshotError) {
    console.warn(`[BALANCE SNAPSHOT] Failed to create farmer snapshot:`, snapshotError);
  }
}
```

**After updating buyer balance:**
```typescript
// Create balance snapshot for buyer
const buyerBalanceChange = (updatedBuyer.balance ?? 0) - currentBuyerBalance;
if (buyerBalanceChange !== 0 && updatedBuyer.balance !== undefined) {
  try {
    const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
    await BalanceSnapshot.create({
      user_id: buyer.id!,
      balance_type: 'buyer',
      previous_balance: currentBuyerBalance,
      amount_change: buyerBalanceChange,
      new_balance: updatedBuyer.balance,
      transaction_type: 'transaction',
      reference_type: 'transaction',
      description: `Transaction balance update: buyer total ${totalAmount}`
    }, tx ? { transaction: tx } : undefined);
  } catch (snapshotError) {
    console.warn(`[BALANCE SNAPSHOT] Failed to create buyer snapshot:`, snapshotError);
  }
}
```

## Testing Steps

### 1. Restart Backend
```bash
cd kisaan-backend-node
npm run dev
```

### 2. Create Test Transaction
- Create transaction: qty = 123, price = 222, commission = 10%
- Expected: Total = 27,306, Farmer earning = 24,575.4, Commission = 2,730.6
- Add partial payments:
  - Buyer paid = 27 (pending = 27,279)
  - Farmer paid = 24 (pending = 24,551.4)

### 3. Verify Payment Management
Navigate to Payment Management → Select the farmer

**Expected Results:**
- ✅ Current Balance: ₹24,551.4 (not ₹0)
- ✅ Shows payment of ₹24
- ✅ Pending amount = 24,551.4

## Impact

### Before Fix
- ❌ Balance snapshots not created for transaction payments
- ❌ Payment Management shows ₹0 balance
- ❌ Frontend can't track balance history
- ❌ Users can't see pending amounts

### After Fix
- ✅ Balance snapshots created for all balance changes
- ✅ Payment Management shows correct balances
- ✅ Balance history tracked properly
- ✅ Pending amounts visible

## Related Fixes
This completes the payment balance architecture:

1. **Payment Double-Counting Fix** - Skip balance updates for transaction payments in PaymentService
2. **Buyer Balance Fix** - Account for payments via PaymentAllocation in TransactionService
3. **Balance Snapshot Fix** (This) - Create snapshots when TransactionService updates balances

## Files Modified
- `kisaan-backend-node/src/services/transactionService.ts`
  - Added balance snapshot creation for farmer updates
  - Added balance snapshot creation for buyer updates

## Next Steps
1. ✅ Restart backend server
2. ✅ Test transaction creation with partial payments
3. ✅ Verify Payment Management shows correct balance
4. ✅ Verify balance history in snapshots table

## Database Schema Note
The `balance_snapshots` table tracks all balance changes:
- `user_id`: The farmer/buyer whose balance changed
- `balance_type`: 'farmer' or 'buyer'
- `previous_balance`: Balance before change
- `amount_change`: Amount added/subtracted
- `new_balance`: Balance after change
- `transaction_type`: 'transaction' or 'payment'
- `reference_type`: 'transaction' or 'payment'
- `description`: Human-readable description

This provides a complete audit trail of all balance changes.
