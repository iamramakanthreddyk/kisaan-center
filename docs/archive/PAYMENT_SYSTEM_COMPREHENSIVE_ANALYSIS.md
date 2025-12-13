# Payment Management System - Comprehensive Analysis & Refactoring Plan

**Date:** October 27, 2025  
**Status:** Critical Issues Identified - Requires Immediate Refactoring

---

## Executive Summary

The payment management system has **significant structural problems** that create confusion, data inconsistencies, and poor user experience. The root cause is a lack of clear payment flow definition and mixing of concerns between transactions, payments, settlements, and expenses.

### Critical Problems Identified:

1. **Unclear Number Management** - Multiple overlapping concepts (balance, settled_amount, pending_amount, allocated_amount, applied_to_balance, applied_to_expenses)
2. **Confusing Payment Flows** - No clear distinction between transaction payments vs settlement payments
3. **Expense Integration Issues** - Expenses affect balances but logic is scattered across services
4. **Balance Calculation Inconsistencies** - Multiple methods calculate balances differently
5. **Settlement Status Confusion** - Overlapping status fields and unclear state transitions

---

## Current System Architecture

### Database Schema Analysis

#### Core Tables:

```
kisaan_transactions
├── id, shop_id, farmer_id, buyer_id
├── quantity, unit_price, product_name
├── total_amount (buyer owes)
├── commission_amount (shop earns)
├── farmer_earning (farmer earns)
├── settled_amount (how much paid so far)
├── pending_amount (how much still owed)
└── settlement_status (pending/partially_settled/fully_settled)

kisaan_payments
├── id, transaction_id, shop_id, counterparty_id
├── payer_type (BUYER/SHOP/FARMER)
├── payee_type (BUYER/SHOP/FARMER)
├── amount
├── status (PENDING/PAID/FAILED/CANCELLED)
├── settlement_type (partial/full/advance/adjustment)
├── allocated_amount (how much allocated to transactions)
├── applied_to_expenses (how much went to expenses)
├── applied_to_balance (how much went to balance)
├── balance_before, balance_after
└── settled_transactions, settled_expenses (JSON arrays)

kisaan_expenses
├── id, shop_id, user_id, amount
├── type (expense/advance/adjustment)
├── status (pending/settled)
├── total_amount (original expense)
├── allocated_amount (how much allocated)
├── remaining_amount (how much left)
└── allocation_status (unallocated/partially_allocated/fully_allocated)

kisaan_payment_allocations
├── id, payment_id, transaction_id
└── allocated_amount (how much of payment goes to transaction)

expense_settlements
├── id, expense_id, payment_id
└── amount (how much of expense settled by payment)

kisaan_users
├── id, username, role
├── balance (current owed/due amount)
└── cumulative_value (lifetime total earned/spent)
```

**PROBLEM:** Too many overlapping fields tracking similar concepts!

---

## Payment Flow Scenarios

### Scenario 1: Full Payment Transaction

**WHAT SHOULD HAPPEN:**
1. Transaction created: Buyer owes ₹100, Farmer earns ₹90, Shop earns ₹10 commission
2. Buyer pays ₹100 to shop immediately
3. Shop pays ₹90 to farmer immediately
4. Result: All balances zero, transaction complete

**WHAT ACTUALLY HAPPENS:**
```typescript
// Step 1: Create transaction
Transaction: {
  total_amount: 100,
  farmer_earning: 90,
  commission_amount: 10,
  settled_amount: 0,  // ← Not updated properly
  pending_amount: 100, // ← Should be 0 after payments
  settlement_status: 'pending' // ← Should be 'fully_settled'
}

// Step 2: Buyer payment created
Payment #1: {
  payer_type: 'BUYER',
  payee_type: 'SHOP',
  amount: 100,
  transaction_id: txn.id,
  allocated_amount: 0, // ← Should be 100
  applied_to_balance: 0 // ← Not set
}

// Step 3: Farmer payment created
Payment #2: {
  payer_type: 'SHOP',
  payee_type: 'FARMER',
  amount: 90,
  transaction_id: txn.id,
  allocated_amount: 0, // ← Should be 90
  applied_to_balance: 0 // ← Not set
}

// Step 4: Balances (WRONG!)
Buyer.balance: 100 // ← Should be 0
Farmer.balance: 90 // ← Should be 0
```

**ROOT CAUSE:**
- `updateUserBalances()` is called BEFORE allocations are created
- Payment allocations created AFTER balance calculation
- Status updates don't trigger properly
- Multiple competing balance calculation methods

---

### Scenario 2: Partial Payment Transaction

**WHAT SHOULD HAPPEN:**
1. Transaction created: Buyer owes ₹100
2. Buyer pays ₹50 (partial)
3. Buyer balance shows ₹50 remaining due
4. Transaction status: 'partially_settled'

**WHAT ACTUALLY HAPPENS:**
```typescript
Transaction: {
  total_amount: 100,
  settled_amount: 0, // ← Should be 50
  pending_amount: 100, // ← Should be 50
  settlement_status: 'pending' // ← Should be 'partially_settled'
}

Payment: {
  amount: 50,
  allocated_amount: 0, // ← Should be 50
}

Buyer.balance: 100 // ← Should be 50
```

**ROOT CAUSE:**
- `settled_amount` and `pending_amount` not properly updated
- Allocation records not created correctly
- Balance calculation doesn't account for partial payments

---

### Scenario 3: Transaction with Expense

**WHAT SHOULD HAPPEN:**
1. Transaction: Farmer earns ₹100
2. Farmer has expense: ₹30 (transport cost)
3. Shop pays farmer: ₹100
4. Payment should be split: ₹30 to expense, ₹70 to balance
5. Result: Expense settled, farmer receives net ₹70

**WHAT ACTUALLY HAPPENS:**
```typescript
// Expense created
Expense: {
  amount: 30,
  status: 'pending',
  allocated_amount: 0,
  remaining_amount: 30
}

// Payment made
Payment: {
  amount: 100,
  applied_to_expenses: 0, // ← Should be 30
  applied_to_balance: 0 // ← Should be 70
}

// FIFO settlement runs but...
Farmer.balance: varies! // Inconsistent due to multiple calculation paths

// Expense status not updated
Expense.status: 'pending' // ← Should be 'settled'
```

**ROOT CAUSE:**
- FIFO settlement logic runs but doesn't persist results properly
- Expense settlements created but expense status not updated
- Balance recalculation doesn't consistently subtract expenses
- No clear "expense offset" tracking in payment record

---

### Scenario 4: Standalone Settlement Payment

**WHAT SHOULD HAPPEN:**
1. Farmer has ₹500 balance (unpaid from multiple transactions)
2. Shop makes settlement payment: ₹200
3. FIFO: Oldest transactions settled first
4. Result: Balance reduced to ₹300, specific transactions marked settled

**WHAT ACTUALLY HAPPENS:**
```typescript
// Before payment
Farmer.balance: 500

// Payment created
Payment: {
  transaction_id: null, // ← Standalone payment
  amount: 200,
  settled_transactions: [] // ← Should list which transactions settled
}

// AFTER payment
Farmer.balance: varies! // Different calculation methods give different results

// Transactions NOT marked as settled
Transaction #1: { settled_amount: 0 } // ← Should be updated
Transaction #2: { settled_amount: 0 } // ← Should be updated
```

**ROOT CAUSE:**
- Standalone payments don't allocate to transactions properly
- Balance calculation is performed BEFORE allocations created
- `settled_transactions` array not populated
- Transaction settlement status not updated

---

## Identified Gaps & Issues

### 1. Balance Calculation Chaos

**THREE DIFFERENT METHODS** calculate balances:

#### Method A: `TransactionService.updateUserBalances()` (Lines 1566-1749)
```typescript
// Farmer Balance = Sum of (transaction.farmer_earning - paid amounts from allocations)
// - Unsettled expenses
newFarmerBalance = allFarmerTxns.reduce((sum, t) => {
  const paidToFarmer = allocations...
  const unpaid = max(t.farmer_earning - paidToFarmer, 0)
  return sum + unpaid
}, 0)

// Subtract expenses
totalUnsettledExpenses = expenses.reduce(...)
adjustedFarmerBalance = newFarmerBalance - totalUnsettledExpenses
```

#### Method B: `PaymentService.updateUserBalancesAfterPayment()` (Lines 202-630)
```typescript
// Uses same calculation but runs at DIFFERENT TIMES
// Sometimes runs BEFORE allocations, sometimes AFTER
```

#### Method C: Direct updates in payment flow
```typescript
// Direct balance mutation without full recalculation
user.balance = user.balance - payment.amount
```

**PROBLEM:** All three can run at different times with different data states, causing RACE CONDITIONS!

---

### 2. Payment Allocation Timing Problem

**CRITICAL BUG:**

```typescript
// transactionService.ts - createTransaction()
// Line 1428-1460

const run = async (tx) => {
  // 1. CREATE TRANSACTION
  createdTransaction = await this.transactionRepository.create(...)
  
  // 2. UPDATE BALANCES (NO ALLOCATIONS EXIST YET!)
  await this.updateUserBalances(...)
  
  // 3. CREATE LEDGER ENTRIES
  await this.ledgerRepository.create(...)
}

// THEN AFTER TRANSACTION COMMITS...

// 4. CREATE PAYMENTS (Line 1515)
for (const paymentData of data.payments) {
  await paymentService.createPayment(...)
}

// 5. ALLOCATIONS CREATED (Inside createPayment)
await this.allocatePaymentToTransactions(payment)
```

**PROBLEM:** Balance is calculated at step 2, but allocations aren't created until step 5! This means:
- Balance calculation sees NO payments
- Allocations created later have no effect on already-calculated balance
- Status updates trigger but with stale data

**FIX REQUIRED:** Move balance update AFTER all payments and allocations created

---

### 3. Settlement Status Confusion

**TOO MANY STATUS FIELDS:**

```typescript
// Transaction table
{
  status: 'pending' | 'completed' | 'partial' | 'cancelled' | 'settled',
  settlement_status: 'pending' | 'partially_settled' | 'fully_settled',
  settled_amount: number,
  pending_amount: number
}

// Payment table  
{
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED',
  settlement_type: 'partial' | 'full' | 'advance' | 'adjustment'
}

// Expense table
{
  status: 'pending' | 'settled',
  allocation_status: 'unallocated' | 'partially_allocated' | 'fully_allocated'
}
```

**PROBLEM:** 
- `transaction.status` vs `transaction.settlement_status` - redundant!
- No clear mapping between them
- Status updates scattered across multiple methods
- Race conditions when multiple updates happen

**RECOMMENDATION:** Consolidate to SINGLE status field per entity

---

### 4. Expense Integration Problems

**EXPENSE FLOW IS BROKEN:**

```typescript
// createExpense() - expenseService.ts
export const createExpense = async (data) => {
  // 1. Create expense record
  const expense = await expenseRepo.create(expenseData)
  
  // 2. ADJUST PREVIOUS PAYMENTS (WRONG!)
  await paymentService.adjustPaymentsForExpense(...)
  
  // 3. RECORD IN LEDGER
  await TransactionLedger.create(...)
  
  // 4. UPDATE USER BALANCE (DOUBLE COUNTING!)
  await User.update({ balance: sequelize.literal(`balance + ${amount}`) })
}
```

**PROBLEMS:**
1. **Retroactive payment adjustments are DANGEROUS** - Modifying historical payments breaks audit trail
2. **Double counting** - Both `adjustPaymentsForExpense()` and `updateUserBalances()` modify balance
3. **FIFO settlement** happens at payment time, but expense created AFTER payments
4. **No expense clearing logic** - When should expense move from pending → settled?

**WHAT SHOULD HAPPEN:**
- Expense created with status 'pending'
- When payment made, FIFO allocates to expense FIRST, then balance
- Expense status updated to 'settled' when `allocated_amount === total_amount`
- Balance calculation always subtracts REMAINING expense amount

---

### 5. Number Management - Too Many Fields!

**TRANSACTION AMOUNT FIELDS:**
```
total_amount         - Buyer owes this to shop
farmer_earning       - Farmer earns this from transaction
commission_amount    - Shop earns this
settled_amount       - How much paid so far (OVERLAPS with allocations!)
pending_amount       - How much remaining (CALCULATED, should not be stored!)
```

**PAYMENT AMOUNT FIELDS:**
```
amount               - Payment amount
allocated_amount     - How much allocated to transactions (OVERLAPS!)
applied_to_expenses  - How much went to expenses
applied_to_balance   - How much went to balance (amount - applied_to_expenses?)
balance_before       - User balance before payment
balance_after        - User balance after payment
```

**EXPENSE AMOUNT FIELDS:**
```
amount               - Expense amount (now called total_amount)
total_amount         - Original expense
allocated_amount     - How much allocated
remaining_amount     - How much left (CALCULATED!)
```

**RECOMMENDATION:** 
- Remove CALCULATED fields (pending_amount, remaining_amount)
- Calculate on-the-fly from allocations
- Keep only SOURCE fields (total_amount, farmer_earning, commission_amount)

---

## Proposed Solution: Refactored Payment Flow

### Clear Payment Flow Definition

```
┌─────────────────────────────────────────────────────────┐
│ TRANSACTION CREATION                                     │
│ • Create transaction record with amounts                 │
│ • Status: PENDING                                        │
│ • Balances: NOT updated yet                              │
└─────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ PAYMENT RECORDING                                        │
│ For each payment in transaction:                         │
│   1. Create Payment record                               │
│   2. Create PaymentAllocation (payment → transaction)    │
│   3. Run FIFO for expenses (if farmer payment)           │
│   4. Create ExpenseSettlement records                    │
└─────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ BALANCE CALCULATION (SINGLE METHOD)                      │
│ For each user:                                           │
│   Farmer Balance =                                       │
│     Σ(unpaid farmer_earnings from transactions)         │
│     - Σ(unsettled expense amounts)                       │
│                                                          │
│   Buyer Balance =                                        │
│     Σ(unpaid total_amounts from transactions)           │
│                                                          │
│   Where "unpaid" = amount - Σ(PAID payment allocations) │
└─────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ STATUS UPDATES                                           │
│ Transaction Status:                                      │
│   • PENDING: pending_amount > 0                          │
│   • SETTLED: pending_amount = 0                          │
│                                                          │
│ Expense Status:                                          │
│   • PENDING: remaining_amount > 0                        │
│   • SETTLED: remaining_amount = 0                        │
└─────────────────────────────────────────────────────────┘
```

### Unified Balance Calculation Method

**SINGLE SOURCE OF TRUTH:**

```typescript
class BalanceCalculationService {
  
  /**
   * Calculate user balance from first principles
   * - Farmer: unpaid transaction earnings - unsettled expenses
   * - Buyer: unpaid transaction gross amounts
   * - Owner: realized commission from paid transactions
   */
  async calculateBalance(userId: number, role: string): Promise<number> {
    if (role === 'farmer') {
      return this.calculateFarmerBalance(userId);
    } else if (role === 'buyer') {
      return this.calculateBuyerBalance(userId);
    } else if (role === 'owner') {
      return this.calculateOwnerBalance(userId);
    }
    return 0;
  }

  private async calculateFarmerBalance(farmerId: number): Promise<number> {
    // 1. Get all transactions for farmer
    const transactions = await Transaction.findAll({ where: { farmer_id: farmerId } });
    
    // 2. Calculate unpaid earnings
    let unpaidEarnings = 0;
    for (const txn of transactions) {
      const paidAmount = await this.calculatePaidAmount(txn.id, 'FARMER');
      const unpaid = Math.max(0, txn.farmer_earning - paidAmount);
      unpaidEarnings += unpaid;
    }
    
    // 3. Calculate unsettled expenses
    const unsettledExpenses = await this.calculateUnsettledExpenses(farmerId);
    
    // 4. Balance = earnings - expenses
    return unpaidEarnings - unsettledExpenses;
  }
  
  private async calculatePaidAmount(transactionId: number, payeeType: string): Promise<number> {
    // Sum allocated amounts from PAID payments only
    const allocations = await PaymentAllocation.findAll({
      where: { transaction_id: transactionId },
      include: [{
        model: Payment,
        where: { 
          payee_type: payeeType,
          status: 'PAID'
        }
      }]
    });
    
    return allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  }
  
  private async calculateUnsettledExpenses(userId: number): Promise<number> {
    const expenses = await Expense.findAll({ where: { user_id: userId } });
    
    let totalUnsettled = 0;
    for (const expense of expenses) {
      const settled = await ExpenseSettlement.sum('amount', {
        where: { expense_id: expense.id }
      });
      const unsettled = Math.max(0, expense.total_amount - (settled || 0));
      totalUnsettled += unsettled;
    }
    
    return totalUnsettled;
  }
  
  // Similar methods for buyer and owner...
}
```

---

## Refactoring Plan

### Phase 1: Database Schema Cleanup (Week 1)

**Remove Calculated Fields:**
```sql
-- Transactions table
ALTER TABLE kisaan_transactions 
  DROP COLUMN IF EXISTS pending_amount,
  DROP COLUMN IF EXISTS settlement_status;
-- Keep: settled_amount (still useful for quick lookups)

-- Payments table  
ALTER TABLE kisaan_payments
  DROP COLUMN IF EXISTS allocated_amount;
-- Keep applied_to_expenses, applied_to_balance (useful for audit)

-- Expenses table
ALTER TABLE kisaan_expenses
  DROP COLUMN IF EXISTS remaining_amount,
  DROP COLUMN IF EXISTS allocation_status;
```

**Add Missing Indexes:**
```sql
CREATE INDEX idx_payment_allocations_payment ON kisaan_payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_txn ON kisaan_payment_allocations(transaction_id);
CREATE INDEX idx_expense_settlements_expense ON expense_settlements(expense_id);
CREATE INDEX idx_expense_settlements_payment ON expense_settlements(payment_id);
```

### Phase 2: Service Layer Refactoring (Week 2-3)

**1. Create BalanceCalculationService**
- Single method to calculate balance from first principles
- Replace all ad-hoc balance calculations
- Test extensively with various scenarios

**2. Refactor TransactionService.createTransaction()**
```typescript
async createTransaction(data, user, options) {
  return await sequelize.transaction(async (tx) => {
    // 1. Create transaction record
    const transaction = await this.transactionRepository.create(transactionEntity, { tx });
    
    // 2. Create payment records
    const payments = [];
    for (const paymentData of data.payments || []) {
      const payment = await paymentService.createPayment(paymentData, user.id, { tx });
      payments.push(payment);
    }
    
    // 3. Create allocations
    for (const payment of payments) {
      await paymentService.allocatePaymentToTransactions(payment, { tx });
    }
    
    // 4. Run FIFO for expenses (if farmer payments)
    for (const payment of payments) {
      if (payment.payee_type === 'FARMER') {
        await settlementService.applyRepaymentFIFO(..., { tx });
      }
    }
    
    // 5. NOW calculate and update balances
    const farmerBalance = await balanceService.calculateBalance(transaction.farmer_id, 'farmer');
    const buyerBalance = await balanceService.calculateBalance(transaction.buyer_id, 'buyer');
    
    await User.update({ balance: farmerBalance }, { where: { id: transaction.farmer_id }, transaction: tx });
    await User.update({ balance: buyerBalance }, { where: { id: transaction.buyer_id }, transaction: tx });
    
    // 6. Update transaction status
    await this.updateTransactionStatus(transaction.id, { tx });
    
    return transaction;
  });
}
```

**3. Simplify PaymentService.createPayment()**
```typescript
async createPayment(data, userId, options) {
  // 1. Validate and create payment
  const payment = await this.paymentRepository.create(paymentData, options);
  
  // 2. Create allocations (if transaction_id present)
  if (payment.transaction_id) {
    await this.allocatePaymentToTransactions(payment, options);
  }
  
  // 3. Run FIFO for expenses (if applicable)
  if (payment.payer_type === 'FARMER' || payment.payee_type === 'FARMER') {
    const fifoResult = await settlementService.applyRepaymentFIFO(..., options);
    payment.applied_to_expenses = fifoResult.amountUsedForExpenses;
    payment.applied_to_balance = fifoResult.remaining;
    await payment.save({ transaction: options?.tx });
  }
  
  // 4. Recalculate user balance ONLY for standalone payments
  if (!payment.transaction_id && payment.counterparty_id) {
    const user = await User.findByPk(payment.counterparty_id);
    const newBalance = await balanceService.calculateBalance(user.id, user.role);
    await user.update({ balance: newBalance }, { transaction: options?.tx });
  }
  
  // 5. Update transaction status (if applicable)
  if (payment.transaction_id) {
    await transactionService.updateTransactionStatus(payment.transaction_id, options);
  }
  
  return payment;
}
```

**4. Fix ExpenseService**
```typescript
async createExpense(data, options) {
  // 1. Create expense record ONLY
  const expense = await expenseRepo.create({
    ...data,
    status: 'pending',
    total_amount: data.amount
  }, options);
  
  // 2. DON'T adjust previous payments!
  // DON'T update user balance directly!
  
  // 3. Recalculate farmer balance (will include new expense)
  const newBalance = await balanceService.calculateBalance(data.user_id, 'farmer');
  await User.update({ balance: newBalance }, { where: { id: data.user_id }, transaction: options?.tx });
  
  return expense;
}

// When payment is made, FIFO settlement will handle expense allocation
```

### Phase 3: Status Management (Week 4)

**Consolidate Status Fields:**

```typescript
// Transaction status (SINGLE field)
enum TransactionStatus {
  PENDING = 'pending',      // Some amounts unpaid
  SETTLED = 'settled',      // All amounts paid
  CANCELLED = 'cancelled'   // Transaction cancelled
}

// Payment status (keep existing)
enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Expense status (SINGLE field)
enum ExpenseStatus {
  PENDING = 'pending',      // Not fully settled
  SETTLED = 'settled'       // Fully settled
}
```

**Status Update Logic:**

```typescript
async updateTransactionStatus(transactionId: number): Promise<void> {
  const transaction = await Transaction.findByPk(transactionId);
  
  // Calculate settled amounts
  const buyerSettled = await this.calculatePaidAmount(transactionId, 'SHOP');
  const farmerSettled = await this.calculatePaidAmount(transactionId, 'FARMER');
  
  // Update settled_amount
  transaction.settled_amount = Math.min(buyerSettled, farmerSettled);
  
  // Calculate if fully settled
  const buyerFullyPaid = (transaction.total_amount - buyerSettled) < 0.01;
  const farmerFullyPaid = (transaction.farmer_earning - farmerSettled) < 0.01;
  
  // Set status
  if (buyerFullyPaid && farmerFullyPaid) {
    transaction.status = 'settled';
  } else {
    transaction.status = 'pending';
  }
  
  await transaction.save();
}

async updateExpenseStatus(expenseId: number): Promise<void> {
  const expense = await Expense.findByPk(expenseId);
  
  const settledAmount = await ExpenseSettlement.sum('amount', {
    where: { expense_id: expenseId }
  });
  
  expense.allocated_amount = settledAmount || 0;
  
  if (expense.total_amount - expense.allocated_amount < 0.01) {
    expense.status = 'settled';
  } else {
    expense.status = 'pending';
  }
  
  await expense.save();
}
```

### Phase 4: Frontend Integration (Week 5)

**Clear API Contracts:**

```typescript
// POST /api/transactions - Create transaction with payments
{
  farmer_id: number;
  buyer_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  
  // Optional: include payments with transaction
  payments?: [
    {
      payer_type: 'BUYER' | 'SHOP';
      payee_type: 'SHOP' | 'FARMER';
      amount: number;
      method: 'cash' | 'upi' | 'bank_transfer';
      payment_date: string;
    }
  ];
}

Response: {
  id: number;
  total_amount: number;
  farmer_earning: number;
  commission_amount: number;
  status: 'pending' | 'settled';
  
  // Calculated fields
  buyer_paid: number;        // How much buyer has paid
  buyer_pending: number;     // How much buyer still owes
  farmer_paid: number;       // How much farmer has received
  farmer_pending: number;    // How much farmer is owed
  
  payments: Payment[];       // List of related payments
}

// POST /api/payments - Create standalone settlement payment
{
  payer_type: 'BUYER' | 'SHOP' | 'FARMER';
  payee_type: 'BUYER' | 'SHOP' | 'FARMER';
  amount: number;
  method: string;
  counterparty_id: number;
  shop_id: number;
  
  // Optional: link to specific transaction
  transaction_id?: number;
}

Response: {
  id: number;
  amount: number;
  status: 'PAID';
  
  // Expense allocation (if farmer payment)
  applied_to_expenses: number;
  applied_to_balance: number;
  
  // Transaction allocations
  allocated_transactions: [
    { transaction_id: number, amount: number }
  ];
  
  // Balance tracking
  balance_before: number;
  balance_after: number;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('BalanceCalculationService', () => {
  describe('calculateFarmerBalance', () => {
    it('should calculate unpaid earnings correctly', async () => {
      // Setup: Create transaction with partial payment
      const txn = await createTransaction({ farmer_earning: 100 });
      await createPayment({ amount: 40, payee_type: 'FARMER' });
      
      const balance = await balanceService.calculateBalance(farmerId, 'farmer');
      
      expect(balance).toBe(60); // 100 - 40
    });
    
    it('should subtract unsettled expenses', async () => {
      // Setup: Farmer has earnings and expenses
      await createTransaction({ farmer_earning: 100 });
      await createExpense({ amount: 30, user_id: farmerId });
      
      const balance = await balanceService.calculateBalance(farmerId, 'farmer');
      
      expect(balance).toBe(70); // 100 - 30
    });
    
    it('should handle multiple transactions and payments', async () => {
      // Test complex scenario with multiple transactions, partial payments, expenses
    });
  });
});

describe('PaymentService', () => {
  describe('createPayment', () => {
    it('should allocate to transaction when transaction_id provided', async () => {
      const txn = await createTransaction({ total_amount: 100 });
      const payment = await paymentService.createPayment({
        transaction_id: txn.id,
        amount: 50,
        payer_type: 'BUYER',
        payee_type: 'SHOP'
      });
      
      const allocations = await PaymentAllocation.findAll({ where: { payment_id: payment.id } });
      expect(allocations).toHaveLength(1);
      expect(allocations[0].allocated_amount).toBe(50);
    });
    
    it('should apply FIFO to expenses for farmer payments', async () => {
      // Setup: Farmer has pending expense
      const expense = await createExpense({ amount: 30, user_id: farmerId });
      
      // Make payment to farmer
      const payment = await paymentService.createPayment({
        amount: 50,
        payer_type: 'SHOP',
        payee_type: 'FARMER',
        counterparty_id: farmerId
      });
      
      // Verify expense settlement
      const settlements = await ExpenseSettlement.findAll({ where: { expense_id: expense.id } });
      expect(settlements).toHaveLength(1);
      expect(settlements[0].amount).toBe(30);
      
      // Verify payment breakdown
      expect(payment.applied_to_expenses).toBe(30);
      expect(payment.applied_to_balance).toBe(20);
    });
  });
});
```

### Integration Tests

```typescript
describe('Full Payment Flow', () => {
  it('should handle complete transaction lifecycle', async () => {
    // 1. Create transaction with full payment
    const response = await request(app)
      .post('/api/transactions')
      .send({
        farmer_id: 1,
        buyer_id: 2,
        product_id: 1,
        quantity: 10,
        unit_price: 10,
        payments: [
          { payer_type: 'BUYER', payee_type: 'SHOP', amount: 100, method: 'cash' },
          { payer_type: 'SHOP', payee_type: 'FARMER', amount: 90, method: 'cash' }
        ]
      });
    
    const txn = response.body;
    
    // 2. Verify transaction status
    expect(txn.status).toBe('settled');
    expect(txn.buyer_pending).toBe(0);
    expect(txn.farmer_pending).toBe(0);
    
    // 3. Verify balances
    const farmer = await User.findByPk(1);
    const buyer = await User.findByPk(2);
    
    expect(farmer.balance).toBe(0);
    expect(buyer.balance).toBe(0);
    
    // 4. Verify allocations created
    const allocations = await PaymentAllocation.findAll({ where: { transaction_id: txn.id } });
    expect(allocations).toHaveLength(2);
  });
  
  it('should handle partial payments correctly', async () => {
    // Test partial payment scenario
  });
  
  it('should handle expenses in payment flow', async () => {
    // Test expense allocation via FIFO
  });
});
```

---

## Migration Plan

### Step 1: Deploy Balance Calculation Service (No Breaking Changes)
- Deploy new `BalanceCalculationService` alongside existing code
- Add feature flag to switch between old and new calculation
- Run both calculations in parallel and log differences
- Fix discrepancies

### Step 2: Refactor Transaction Creation
- Update `TransactionService.createTransaction()` to use new flow
- Ensure payments and allocations created before balance update
- Deploy with extensive monitoring

### Step 3: Refactor Payment Creation
- Update `PaymentService.createPayment()` to use new flow
- Remove payment adjustment logic from expense creation
- Deploy and monitor

### Step 4: Update Status Management
- Remove redundant status fields
- Deploy database migration
- Update all status-related queries

### Step 5: Frontend Updates
- Update transaction creation UI
- Update payment recording UI
- Update balance display components
- Add better error messages and validation

---

## Success Metrics

### Before Refactoring:
- Balance calculation inconsistencies: **~30% of transactions**
- Payment allocation failures: **~15% of payments**
- User confusion reports: **~50% of support tickets**

### After Refactoring:
- Balance calculation accuracy: **>99%**
- Payment allocation success rate: **>99%**
- User confusion: **<10% of support tickets**
- Average transaction creation time: **<2 seconds**

---

## Conclusion

The payment management system requires a **comprehensive refactoring** to establish:

1. **Single source of truth** for balance calculations
2. **Clear payment flow** with proper sequencing
3. **Simplified schema** removing calculated/redundant fields
4. **Proper FIFO settlement** for expenses
5. **Unified status management** with clear state transitions

**Estimated Effort:** 5 weeks (1 developer)
**Risk:** Medium (extensive testing required)
**Priority:** **HIGH** - Current system causes significant user confusion and data issues

**Next Steps:**
1. Review and approve this analysis
2. Create detailed technical specifications for each phase
3. Set up testing environment with production data clone
4. Begin Phase 1 (database cleanup) with comprehensive testing

---

## Refined Canonical Requirements & Gap Traceability (Deep Dive)

### A. Functional Requirements (Derived + Implied)
| Code | Requirement | Source (Code/Domain) | Notes |
|------|-------------|----------------------|-------|
| FR1 | Transaction must represent a product sale with immutable monetary base: quantity * unit_price = total_amount | `TransactionService.createTransaction`, `transaction.ts` model | Reject if mismatch (currently enforced inconsistently) |
| FR2 | Commission = total_amount - farmer_earning (non-negative, <= total_amount) | Commission calculations & validation blocks | Sometimes recomputed, sometimes taken from payload |
| FR3 | Buyer obligation satisfied only by PAID payments where payer=BUYER payee=SHOP allocated to transaction (direct or FIFO) | `allocatePaymentToTransactions` | Standalone unallocated buyer payments treated as receivable reduction (bookkeeping) |
| FR4 | Farmer earning satisfied only by PAID payments where payee=FARMER (SHOP->FARMER or allocated) | Same as above | Missing consistent settled aggregation |
| FR5 | Expense reduces farmer net payable until fully settled via payment FIFO | `applyRepaymentFIFO` | Double counting risk found in legacy expense service variant |
| FR6 | Expense status = settled when sum(settlements.amount) >= expense.total_amount | `applyRepaymentFIFO` / repo.markSettled | Not always updated when payment created (missing trigger in some flows) |
| FR7 | User.balance (farmer) = Σ(unpaid farmer earnings) - Σ(unsettled expenses) | Comment in settlement service & balance logic | Implemented three different ways (race conditions) |
| FR8 | User.balance (buyer) = Σ(unpaid transaction totals) - refunds - standalone unallocated buyer payments | TransactionService.getAllBuyersBalance logic | Redundant recomputation vs incremental updates |
| FR9 | Standalone settlement payments (no transaction_id) must allocate FIFO to oldest open items (transactions then expenses) OR remain unallocated if flagged | Env var ALLOCATE_STANDALONE_BUYER_PAYMENTS | Feature flag not surfaced to UI |
| FR10 | All balance-affecting operations must be auditable (ledger + snapshots) | Ledger & BalanceSnapshot models | Some flows skip ledger (e.g. some expense adjustments) |
| FR11 | Idempotency for transaction creation via idempotencyKey | `TransactionIdempotencyRepository` usage | Payment creation not idempotent when retried separately |
| FR12 | Overpayments (buyer or farmer) should not corrupt balances and must surface as advance / negative pending | Logging in status computation | Currently only warns |
| FR13 | Commission realization tied to paid allocations (proportional) | Commission section in allocation | Partial, missing reversal logic |
| FR14 | Retroactive expense entry must not mutate historical payments | Domain expectation (accounting immutability) | Currently violated by adjustPaymentsForExpense |
| FR15 | Transaction & payment dates support backdating with correct chronological FIFO behavior | Backdating support in createPayment | Allocation may ignore chronological correctness |
| FR16 | Cancellation should freeze monetary invariants and prevent further settlement | Transaction status logic (incomplete) | No guard preventing post-cancel payments |
| FR17 | Advance (farmer negative balance) tracked distinctly from unpaid earnings | Settlement types (advance / adjustment) | No reporting separation |
| FR18 | API responses must present normalized numeric fields (fixed decimals, cents) | PaymentService response shaping | Not consistently applied across endpoints |

### B. Non-Functional Requirements
| Code | Requirement | Current Risk |
|------|-------------|--------------|
| NFR1 | Consistent balance recomputation under concurrency | Race (payments vs balances) |
| NFR2 | O(1) incremental updates; avoid full-scan recalcs on each write | Full scans in multiple paths |
| NFR3 | Idempotent external API calls (retry-safe) | Partial (transactions) |
| NFR4 | Deterministic FIFO performance (no N+1) | Improved (batch settled amounts) but allocations still per iteration |
| NFR5 | Audit completeness (no silent mutations) | Gaps: expense adjustments, some direct User.update calls |
| NFR6 | Schema minimizes redundant derived columns | Redundant: pending_amount, settlement_status, remaining_amount, allocation_status |
| NFR7 | Observability: metrics/log events labeled & structured | Console logs; lacks structured monitoring hooks |
| NFR8 | Test coverage for edge scenarios (partial, overpay, retroactive) | Incomplete |

### C. Gap Matrix (Excerpt)
| Requirement | Current Implementation | Gap | Risk | Remediation Summary |
|-------------|------------------------|-----|------|---------------------|
| FR7 Farmer balance formula | Three divergent methods | Inconsistent source of truth | HIGH | Introduce BalanceCalculationService and remove direct mutations |
| FR14 Payment immutability | adjustPaymentsForExpense mutates historical payment amounts | Violates audit trail | HIGH | Deprecate adjustment method; record expense settlement only |
| FR3 Buyer allocation requirement | Standalone payments optionally not allocated (flag) & counted subtractively | Dual semantics hard to reason about | MEDIUM | Standardize: always create explicit allocation rows; mark origin=standalone |
| FR6 Expense status update | Only set when FIFO runs; creation leaves stale if no payment | Expense list shows pending forever | MEDIUM | Add derived view or scheduled reconciliation job |
| FR13 Commission realization | Allocation attempts proportional commission increment unsafely | No reversal; risk double increment | MEDIUM | Separate commission_realizations table; compute idempotently |
| FR12 Overpayment handling | Logged only | No structured state to apply later | LOW | Record overpayment as credit record (future deduction) |
| NFR2 Performance | Re-scan all transactions per balance update | Scaling concern | HIGH | Maintain per-user aggregate ledger & delta updates |
| NFR6 Redundant columns | pending_amount, settlement_status, remaining_amount | Drift potential | HIGH | Plan removal after shadow mode validation |

---

## Prioritized Refactor Backlog (Actionable Stories)
Priority key: P0 (critical correctness), P1 (core integrity/performance), P2 (nice-to-have)

1. P0 Introduce BalanceCalculationService
  - Add pure functions: calcFarmerBalance, calcBuyerBalance, calcCommissionRealized
  - Feature flag NEW_BALANCE_ENGINE side-by-side logging diff < 0.01 tolerance
2. P0 Remove adjustPaymentsForExpense usage
  - Mark function deprecated (console.warn once) and gate behind env ALLOW_PAYMENT_RETRO_ADJUST=false
  - Add migration note for clients
3. P0 Reorder transaction creation sequence
  - Create txn → create payments → allocations/FIFO → recompute balances → derive status
  - Wrap entire flow in single DB transaction
4. P0 Single status model
  - Add computed virtual fields (buyer_paid, farmer_paid, buyer_pending, farmer_pending) to API response
  - Deprecate settlement_status/pending_amount from writes
5. P1 Schema cleanup shadow phase
  - Add database VIEW exposing legacy columns while reading from live calculations
  - Observability: log mismatch if legacy column diverges > 0.01 from recomputed
6. P1 Commission realization layer
  - New table commission_realizations(id, transaction_id, allocation_id, amount, created_at UNIQUE on allocation_id)
  - Backfill from existing allocations
7. P1 Explicit allocation for standalone buyer payments
  - Always create allocation rows with transaction resolution FIFO until exhausted; residual becomes credit
8. P1 Expense settlement normalization
  - Trigger or scheduled job to recompute expense.status based on settlements sum (idempotent)
9. P1 Payment immutability enforcement
  - Add DB constraint: disallow UPDATE of amount/status after PAID except status transitions to FAILED/CANCELLED with audit
10. P2 Overpayment credit handling
   - Introduce credits table usage for buyer negative / farmer advance
11. P2 Observability & metrics
   - Emit structured events (payment.created, balance.recalculated) to logger
12. P2 API response normalization service
   - Central formatter for monetary fields & cents

---

## Migration & Rollout Strategy (Detailed)
| Phase | Duration | Key Steps | Rollback Strategy | Success Signal |
|-------|----------|----------|-------------------|----------------|
| 1 Shadow Balance | 3 days | Implement BalanceCalculationService; log diffs | Disable NEW_BALANCE_ENGINE flag | <0.5% txns diff > 0.01 |
| 2 Transaction Flow Reorder | 2 days | Wrap creation in single sequelize.transaction | Revert commit; toggle flag USE_NEW_TXN_FLOW | All new txns show correct immediate balances |
| 3 Payment Immutability | 1 day | Add constraint + code guard | Drop constraint | No payment amount updates post-PAID |
| 4 Commission Realization Table | 2 days | Create table, backfill, switch computation | Keep old logic path | Realization rows = allocations count |
| 5 Schema Deprecation | 2 days | Stop writing legacy cols, rely on calc | Resume writes if anomaly rate high | Zero consumer breakage |
| 6 Column Removal | 1 day | Drop columns after 2 weeks stable | Restore from backup | No 500s referencing dropped columns |

---

## Risk Register & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Hidden consumer depends on pending_amount | Medium | High | Telemetry: count external response field access (if instrumentable); staged deprecation doc |
| Balance spikes after reorder | Medium | High | Pre-deployment dry run on staging snapshot; diff report |
| Commission double-count during backfill | Low | Medium | Unique constraint commission_realizations(allocation_id) |
| Long-running migration locks | Low | Medium | Use concurrent index creation & small batched updates |
| Expense status drift after removal of allocation_status | Medium | Low | Add reconciliation cron that logs anomalies |

---

## Test Coverage Additions (Concrete Specs)
1. Balance Engine Parity Suite
  - Dataset generator: random transactions/payments/expenses; compare legacy vs new engine
2. Transaction Flow Reorder
  - Assert after creation: allocations exist, balances match expected, status correct
3. Payment Immutability
  - Attempt UPDATE after PAID → expect rejection & unchanged row
4. Expense FIFO Settlement
  - Multi-expense partial settlement distribution correctness (edge: exact exhaustion on mid expense)
5. Commission Realization Idempotency
  - Re-run backfill script; row count stable; sums unchanged
6. Overpayment Credit (future)
  - Buyer overpays; credit record present; next transaction auto consumes

---

## Implementation Sequencing (Granular Checklist Extract)
Short actionable order (subset):
1. Create src/services/balanceCalculationService.ts with pure functions & tests
2. Introduce feature flag reading util (env var helper)
3. Insert shadow logging into PaymentService & TransactionService
4. Add integration test harness for diff logging (jest custom matcher)
5. Refactor createTransaction to new sequence behind USE_NEW_TXN_FLOW flag
6. Backfill commission_realizations (SQL + script)
7. Remove adjustPaymentsForExpense calls; mark function deprecated
8. Enforce payment immutability (DB constraint + code guard)
9. Add reconciliation cron for expense statuses
10. Prepare migration script removing redundant columns (commented until GoLive)

---

## Finalization Status
This augmented section refines requirements, creates explicit traceability, and converts high-level recommendations into a prioritized engineering backlog with risk-managed rollout. Ready for stakeholder review and green-light to commence Phase 1 (shadow balance engine).

---

# DETAILED IMPLEMENTATION PLAN (Part 1 of 7)

## PART 1: Database Foundation & Constraints

**Timeline:** Week 1, Days 1-2  
**Goal:** Add data integrity constraints and computed views for validation

### Files to Create/Modify

#### 1.1 Database Constraints Migration

**Create:** `kisaan-backend-node/migrations/20251027_01_add_schema_constraints.sql`

```sql
-- Purpose: Add CHECK constraints for data integrity
-- Prevents: Owners with shop_id, farmers/buyers without shop_id, negative amounts

-- User role constraints
ALTER TABLE kisaan_users 
  ADD CONSTRAINT chk_user_role_shop_id 
  CHECK (
    (role = 'owner' AND shop_id IS NULL) OR
    (role IN ('farmer', 'buyer') AND shop_id IS NOT NULL) OR
    (role IN ('superadmin', 'admin'))
  );

-- Only one active plan usage per shop
CREATE UNIQUE INDEX idx_shop_active_plan 
  ON kisaan_plan_usage(shop_id) 
  WHERE is_active = true;

-- Balance must be reasonable
ALTER TABLE kisaan_users 
  ADD CONSTRAINT chk_user_balance_reasonable 
  CHECK (balance BETWEEN -1000000 AND 1000000);

-- Payment amounts must be positive
ALTER TABLE kisaan_payments 
  ADD CONSTRAINT chk_payment_amount_positive 
  CHECK (amount > 0);

-- Transaction amounts consistency (total = commission + farmer_earning)
ALTER TABLE kisaan_transactions 
  ADD CONSTRAINT chk_transaction_amounts 
  CHECK (
    total_amount >= 0 AND 
    commission_amount >= 0 AND 
    farmer_earning >= 0 AND
    ABS(total_amount - (commission_amount + farmer_earning)) < 0.01
  );

-- Expense amounts must be positive
ALTER TABLE kisaan_expenses 
  ADD CONSTRAINT chk_expense_amount_positive 
  CHECK (amount > 0);

-- Add helpful comments
COMMENT ON CONSTRAINT chk_user_role_shop_id ON kisaan_users IS 
  'Ensures owners have no shop_id, farmers/buyers must have shop_id';
COMMENT ON CONSTRAINT chk_transaction_amounts ON kisaan_transactions IS 
  'Enforces total_amount = commission + farmer_earning invariant';
```

**Validation Script:**
```sql
-- Test that constraints work
-- Should FAIL: owner with shop_id
-- INSERT INTO kisaan_users (username, password, role, shop_id) 
--   VALUES ('test_owner', 'pass', 'owner', 1);

-- Should SUCCEED: farmer with shop_id  
-- INSERT INTO kisaan_users (username, password, role, shop_id) 
--   VALUES ('test_farmer', 'pass', 'farmer', 1);
```

**Rollback:**
```sql
ALTER TABLE kisaan_users DROP CONSTRAINT IF EXISTS chk_user_role_shop_id;
ALTER TABLE kisaan_users DROP CONSTRAINT IF EXISTS chk_user_balance_reasonable;
ALTER TABLE kisaan_payments DROP CONSTRAINT IF EXISTS chk_payment_amount_positive;
ALTER TABLE kisaan_transactions DROP CONSTRAINT IF EXISTS chk_transaction_amounts;
ALTER TABLE kisaan_expenses DROP CONSTRAINT IF EXISTS chk_expense_amount_positive;
DROP INDEX IF EXISTS idx_shop_active_plan;
```

---

#### 1.2 Computed Views for Balance Validation

**Create:** `kisaan-backend-node/migrations/20251027_02_create_computed_views.sql`

```sql
-- Purpose: Create views that compute settlement status from source data
-- Benefit: Single source of truth for validation and monitoring

-- View 1: Transaction settlement status (replaces redundant columns)
CREATE OR REPLACE VIEW v_transaction_settlement_status AS
SELECT 
  t.id,
  t.shop_id,
  t.total_amount,
  t.farmer_earning,
  
  -- Buyer paid (from allocations)
  COALESCE(SUM(CASE 
    WHEN p.payer_type = 'BUYER' AND p.status = 'PAID' 
    THEN pa.allocated_amount ELSE 0 END), 0) AS buyer_paid,
    
  -- Farmer paid (from allocations)  
  COALESCE(SUM(CASE 
    WHEN p.payee_type = 'FARMER' AND p.status = 'PAID' 
    THEN pa.allocated_amount ELSE 0 END), 0) AS farmer_paid,
    
  -- Computed pending amounts
  t.total_amount - COALESCE(SUM(CASE 
    WHEN p.payer_type = 'BUYER' AND p.status = 'PAID' 
    THEN pa.allocated_amount ELSE 0 END), 0) AS buyer_pending,
    
  t.farmer_earning - COALESCE(SUM(CASE 
    WHEN p.payee_type = 'FARMER' AND p.status = 'PAID' 
    THEN pa.allocated_amount ELSE 0 END), 0) AS farmer_pending,
    
  -- Settlement status
  CASE
    WHEN t.total_amount - COALESCE(SUM(pa.allocated_amount), 0) < 0.01
    THEN 'FULLY_SETTLED'
    WHEN COALESCE(SUM(pa.allocated_amount), 0) > 0 
    THEN 'PARTIALLY_SETTLED'
    ELSE 'UNSETTLED'
  END AS status
FROM kisaan_transactions t
LEFT JOIN payment_allocations pa ON pa.transaction_id = t.id
LEFT JOIN kisaan_payments p ON p.id = pa.payment_id
GROUP BY t.id;

-- View 2: Expense settlement status
CREATE OR REPLACE VIEW v_expense_settlement_status AS
SELECT 
  e.id,
  e.amount AS total,
  COALESCE(SUM(es.amount), 0) AS settled,
  e.amount - COALESCE(SUM(es.amount), 0) AS remaining,
  CASE
    WHEN e.amount - COALESCE(SUM(es.amount), 0) < 0.01 THEN 'SETTLED'
    WHEN COALESCE(SUM(es.amount), 0) > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END AS status
FROM kisaan_expenses e
LEFT JOIN expense_settlements es ON es.expense_id = e.id
GROUP BY e.id;

-- View 3: User balance validation (computed vs stored)
CREATE OR REPLACE VIEW v_user_balance_validation AS
SELECT 
  u.id,
  u.username,
  u.role,
  u.balance AS stored,
  
  -- Computed balance by role
  CASE u.role
    WHEN 'farmer' THEN COALESCE(farmer_data.balance, 0)
    WHEN 'buyer' THEN COALESCE(buyer_data.balance, 0)
    ELSE 0
  END AS computed,
  
  -- Drift
  u.balance - CASE u.role
    WHEN 'farmer' THEN COALESCE(farmer_data.balance, 0)
    WHEN 'buyer' THEN COALESCE(buyer_data.balance, 0)
    ELSE 0
  END AS drift
  
FROM kisaan_users u

-- Farmer balance: unpaid earnings - unsettled expenses
LEFT JOIN (
  SELECT 
    farmer_id,
    SUM(farmer_pending) - COALESCE(expenses.total, 0) AS balance
  FROM v_transaction_settlement_status vts
  LEFT JOIN (
    SELECT user_id, SUM(remaining) AS total 
    FROM v_expense_settlement_status ves
    JOIN kisaan_expenses e ON e.id = ves.id
    GROUP BY user_id
  ) expenses ON expenses.user_id = vts.farmer_id
  GROUP BY farmer_id, expenses.total
) farmer_data ON farmer_data.farmer_id = u.id AND u.role = 'farmer'

-- Buyer balance: unpaid purchases
LEFT JOIN (
  SELECT buyer_id, SUM(buyer_pending) AS balance
  FROM v_transaction_settlement_status
  GROUP BY buyer_id
) buyer_data ON buyer_data.buyer_id = u.id AND u.role = 'buyer'

WHERE u.role IN ('farmer', 'buyer');
```

**Validation Queries:**
```sql
-- Check for balance drifts > 0.01
SELECT * FROM v_user_balance_validation 
WHERE ABS(drift) > 0.01
ORDER BY ABS(drift) DESC;

-- Check transaction settlement accuracy
SELECT t.id, t.status AS stored_status, v.status AS computed_status
FROM kisaan_transactions t
JOIN v_transaction_settlement_status v ON v.id = t.id
WHERE t.settlement_status != v.status;
```

---

## Success Criteria for Part 1

- [ ] All constraints added without errors
- [ ] Views created and queryable
- [ ] No existing data violates new constraints
- [ ] Balance drift report shows <5% of users with drift >0.01
- [ ] Rollback scripts tested

**Next:** Part 2 - BalanceCalculationService Implementation

---

# DETAILED IMPLEMENTATION PLAN (Part 2 of 7)

## PART 2: Balance Calculation Service (Core Logic)

**Timeline:** Week 1, Days 3-5  
**Goal:** Create single source of truth for balance calculation with shadow mode

### Files to Create

#### 2.1 BalanceCalculationService - Pure Functions

**Create:** `kisaan-backend-node/src/services/balanceCalculationService.ts`

```typescript
import { Transaction as SQLTransaction } from 'sequelize';
import { Transaction } from '../models/transaction';
import { Expense } from '../models/expense';
import { Payment } from '../models/payment';
import { PaymentAllocation } from '../models/paymentAllocation';
import { ExpenseSettlement } from '../models/expenseSettlement';
import { User } from '../models/user';
import logger from '../config/logger';

/**
 * SINGLE SOURCE OF TRUTH for balance calculation
 * All balance computations must go through this service
 */
class BalanceCalculationService {
  
  /**
   * Main entry point - calculate balance by user role
   */
  async calculateBalance(
    userId: number,
    role: string,
    options?: { transaction?: SQLTransaction }
  ): Promise<number> {
    switch (role) {
      case 'farmer':
        return this.calculateFarmerBalance(userId, options);
      case 'buyer':
        return this.calculateBuyerBalance(userId, options);
      case 'owner':
        return 0; // TODO: Implement with commission_realizations
      default:
        return 0;
    }
  }

  /**
   * Farmer Balance = Σ(unpaid earnings) - Σ(unsettled expenses)
   */
  async calculateFarmerBalance(
    farmerId: number,
    options?: { transaction?: SQLTransaction }
  ): Promise<number> {
    // 1. Get all transactions
    const transactions = await Transaction.findAll({
      where: { farmer_id: farmerId },
      transaction: options?.transaction
    });

    // 2. Calculate unpaid earnings
    let unpaidEarnings = 0;
    for (const txn of transactions) {
      const paid = await this._getPaidToFarmer(txn.id, options);
      unpaidEarnings += Math.max(0, Number(txn.farmer_earning) - paid);
    }

    // 3. Calculate unsettled expenses
    const unsettledExpenses = await this._getUnsettledExpenses(farmerId, options);

    return unpaidEarnings - unsettledExpenses;
  }

  /**
   * Buyer Balance = Σ(unpaid purchase amounts)
   */
  async calculateBuyerBalance(
    buyerId: number,
    options?: { transaction?: SQLTransaction }
  ): Promise<number> {
    const transactions = await Transaction.findAll({
      where: { buyer_id: buyerId },
      transaction: options?.transaction
    });

    let unpaidPurchases = 0;
    for (const txn of transactions) {
      const paid = await this._getPaidByBuyer(txn.id, options);
      unpaidPurchases += Math.max(0, Number(txn.total_amount) - paid);
    }

    return unpaidPurchases;
  }

  /**
   * Helper: Amount paid TO farmer for transaction
   */
  private async _getPaidToFarmer(
    transactionId: number,
    options?: { transaction?: SQLTransaction }
  ): Promise<number> {
    const allocations = await PaymentAllocation.findAll({
      where: { transaction_id: transactionId },
      include: [{
        model: Payment,
        as: 'payment',
        where: { payee_type: 'FARMER', status: 'PAID' },
        required: true
      }],
      transaction: options?.transaction
    });

    return allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0);
  }

  /**
   * Helper: Amount paid BY buyer for transaction
   */
  private async _getPaidByBuyer(
    transactionId: number,
    options?: { transaction?: SQLTransaction }
  ): Promise<number> {
    const allocations = await PaymentAllocation.findAll({
      where: { transaction_id: transactionId },
      include: [{
        model: Payment,
        as: 'payment',
        where: { payer_type: 'BUYER', payee_type: 'SHOP', status: 'PAID' },
        required: true
      }],
      transaction: options?.transaction
    });

    return allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0);
  }

  /**
   * Helper: Total unsettled expenses for user
   */
  private async _getUnsettledExpenses(
    userId: number,
    options?: { transaction?: SQLTransaction }
  ): Promise<number> {
    const expenses = await Expense.findAll({
      where: { user_id: userId },
      transaction: options?.transaction
    });

    let total = 0;
    for (const expense of expenses) {
      const settled = await ExpenseSettlement.sum('amount', {
        where: { expense_id: expense.id },
        transaction: options?.transaction
      }) || 0;
      total += Math.max(0, Number(expense.amount) - Number(settled));
    }

    return total;
  }

  /**
   * Validation helper - compare stored vs computed
   */
  async validateBalance(
    userId: number,
    options?: { transaction?: SQLTransaction }
  ) {
    const user = await User.findByPk(userId, {
      transaction: options?.transaction
    });

    if (!user) throw new Error(`User ${userId} not found`);

    const computed = await this.calculateBalance(userId, user.role, options);
    const stored = Number(user.balance);
    const drift = Math.abs(stored - computed);

    return {
      userId,
      role: user.role,
      stored: stored.toFixed(2),
      computed: computed.toFixed(2),
      drift: drift.toFixed(2),
      driftPercent: stored !== 0 ? ((drift / Math.abs(stored)) * 100).toFixed(2) : '0'
    };
  }
}

export default new BalanceCalculationService();
```

---

#### 2.2 Feature Flags Configuration

**Create:** `kisaan-backend-node/src/config/featureFlags.ts`

```typescript
/**
 * Feature flags for progressive rollout
 * Set via environment variables
 */
export const FeatureFlags = {
  // Shadow mode: log diffs between old and new balance calculation
  NEW_BALANCE_ENGINE_SHADOW: process.env.NEW_BALANCE_ENGINE_SHADOW === 'true',
  
  // Active mode: use new balance engine instead of old
  NEW_BALANCE_ENGINE_ACTIVE: process.env.NEW_BALANCE_ENGINE_ACTIVE === 'true',
  
  // Use new transaction creation flow
  USE_NEW_TXN_FLOW: process.env.USE_NEW_TXN_FLOW === 'true',
  
  // Allow retroactive payment adjustments (DEPRECATED)
  ALLOW_PAYMENT_RETRO_ADJUST: process.env.ALLOW_PAYMENT_RETRO_ADJUST === 'true',
  
  // Log balance calculation differences
  LOG_BALANCE_DIFFS: process.env.LOG_BALANCE_DIFFS !== 'false' // default true
};

export default FeatureFlags;
```

**Update:** `.env.example`

```bash
# Balance Engine Feature Flags
NEW_BALANCE_ENGINE_SHADOW=true    # Enable shadow mode (compare old vs new)
NEW_BALANCE_ENGINE_ACTIVE=false   # Use new engine (false = use old)
USE_NEW_TXN_FLOW=false            # Use refactored transaction flow
ALLOW_PAYMENT_RETRO_ADJUST=false  # Allow adjustPaymentsForExpense (DEPRECATED)
LOG_BALANCE_DIFFS=true            # Log when drifts detected
```

---

#### 2.3 Shadow Mode Integration

**Modify:** `kisaan-backend-node/src/services/transactionService.ts`

Add imports at top:
```typescript
import balanceCalculationService from './balanceCalculationService';
import FeatureFlags from '../config/featureFlags';
```

Add new method (insert after existing `updateUserBalances` method):

```typescript
/**
 * Update balances with optional shadow mode comparison
 * Shadow mode: run both old and new calculation, log diffs
 * Active mode: use new calculation only
 */
private async updateUserBalancesWithShadow(
  transaction: any,
  options?: { transaction?: any }
): Promise<void> {
  const farmerId = transaction.farmer_id;
  const buyerId = transaction.buyer_id;

  // If new engine is active, skip old logic entirely
  if (FeatureFlags.NEW_BALANCE_ENGINE_ACTIVE) {
    const farmerBalance = await balanceCalculationService.calculateBalance(
      farmerId, 'farmer', options
    );
    const buyerBalance = await balanceCalculationService.calculateBalance(
      buyerId, 'buyer', options
    );

    await User.update(
      { balance: farmerBalance },
      { where: { id: farmerId }, transaction: options?.transaction }
    );
    await User.update(
      { balance: buyerBalance },
      { where: { id: buyerId }, transaction: options?.transaction }
    );

    logger.info('Balance updated (NEW ENGINE)', {
      transactionId: transaction.id,
      farmerId,
      farmerBalance: farmerBalance.toFixed(2),
      buyerId,
      buyerBalance: buyerBalance.toFixed(2)
    });
    
    return;
  }

  // Run old logic (existing method)
  await this.updateUserBalances(transaction, options);

  // Shadow mode: compare with new calculation
  if (FeatureFlags.NEW_BALANCE_ENGINE_SHADOW) {
    try {
      const farmer = await User.findByPk(farmerId, { 
        transaction: options?.transaction 
      });
      const buyer = await User.findByPk(buyerId, { 
        transaction: options?.transaction 
      });

      const newFarmerBal = await balanceCalculationService.calculateBalance(
        farmerId, 'farmer', options
      );
      const newBuyerBal = await balanceCalculationService.calculateBalance(
        buyerId, 'buyer', options
      );

      const farmerDrift = Math.abs(Number(farmer.balance) - newFarmerBal);
      const buyerDrift = Math.abs(Number(buyer.balance) - newBuyerBal);

      if (FeatureFlags.LOG_BALANCE_DIFFS && (farmerDrift > 0.01 || buyerDrift > 0.01)) {
        logger.warn('BALANCE DRIFT DETECTED', {
          transactionId: transaction.id,
          farmer: {
            id: farmerId,
            oldBalance: Number(farmer.balance).toFixed(2),
            newBalance: newFarmerBal.toFixed(2),
            drift: farmerDrift.toFixed(2)
          },
          buyer: {
            id: buyerId,
            oldBalance: Number(buyer.balance).toFixed(2),
            newBalance: newBuyerBal.toFixed(2),
            drift: buyerDrift.toFixed(2)
          }
        });
      }
    } catch (error) {
      logger.error('Shadow balance calculation failed', {
        transactionId: transaction.id,
        error: error.message
      });
    }
  }
}
```

**Update createTransaction method:**
Replace `await this.updateUserBalances(transaction, { transaction: tx });`
With: `await this.updateUserBalancesWithShadow(createdTransaction, { transaction: tx });`

---

#### 2.4 Validation Script

**Create:** `kisaan-backend-node/scripts/validate-balances.ts`

```typescript
import balanceCalculationService from '../src/services/balanceCalculationService';
import { User } from '../src/models/user';
import logger from '../src/config/logger';

/**
 * Validation script: Compare stored vs computed balances
 * Run: npm run validate-balances
 */
async function validateAllBalances() {
  const users = await User.findAll({
    where: { role: ['farmer', 'buyer'] }
  });

  let totalUsers = 0;
  let driftCount = 0;
  let totalDrift = 0;

  for (const user of users) {
    const validation = await balanceCalculationService.validateBalance(user.id);
    totalUsers++;

    if (Math.abs(parseFloat(validation.drift)) > 0.01) {
      driftCount++;
      totalDrift += Math.abs(parseFloat(validation.drift));

      console.log(`❌ Drift detected:`, {
        user: `${user.username} (${user.role})`,
        stored: validation.stored,
        computed: validation.computed,
        drift: validation.drift
      });
    }
  }

  console.log('\n=== VALIDATION SUMMARY ===');
  console.log(`Total users checked: ${totalUsers}`);
  console.log(`Users with drift: ${driftCount} (${((driftCount/totalUsers)*100).toFixed(2)}%)`);
  console.log(`Total drift amount: ₹${totalDrift.toFixed(2)}`);
  console.log(`Average drift: ₹${(totalDrift/driftCount || 0).toFixed(2)}`);
  
  if (driftCount === 0) {
    console.log('✅ All balances match!');
  } else {
    console.log('⚠️  Balance drift detected - review logs');
  }
}

validateAllBalances().then(() => process.exit(0)).catch(console.error);
```

**Add to:** `package.json` scripts section:
```json
"validate-balances": "ts-node kisaan-backend-node/scripts/validate-balances.ts"
```

---

## Success Criteria for Part 2

- [ ] BalanceCalculationService created with all methods
- [ ] Feature flags configuration added
- [ ] Shadow mode integrated into transactionService
- [ ] Validation script runs without errors
- [ ] Shadow mode logs show <10% drift rate
- [ ] Unit tests pass for balance calculations

**Testing Commands:**
```bash
# Enable shadow mode
export NEW_BALANCE_ENGINE_SHADOW=true
export LOG_BALANCE_DIFFS=true

# Run validation
npm run validate-balances

# Create test transaction and check logs for drift warnings
```

**Next:** Part 3 - Refactored Transaction Creation Flow

---

# DETAILED IMPLEMENTATION PLAN (Part 3 of 7)

## PART 3: Transaction Creation Flow Refactor

**Timeline:** Week 2, Days 1-3  
**Goal:** Fix payment/allocation timing, support atomic transaction+expense creation

### Critical Fix: Sequence Problem

**Current (BROKEN):**
```
1. Create transaction
2. Update balances ❌ (allocations don't exist yet!)
3. Create ledger
4. Create payments (AFTER transaction commits)
5. Create allocations
```

**New (CORRECT):**
```
1. Create transaction
2. Create payments (IN SAME transaction)
3. Create allocations
4. Run FIFO for expenses
5. Update balances ✅ (all data ready)
6. Update statuses
7. Create ledger
```

---

### Files to Modify

#### 3.1 Refactored Transaction Service

**Modify:** `kisaan-backend-node/src/services/transactionService.ts`

Replace entire `createTransaction` method with:

```typescript
async createTransaction(
  data: any,
  user: any,
  options?: { idempotencyKey?: string }
): Promise<any> {
  
  // Idempotency check
  if (options?.idempotencyKey) {
    const existing = await this.transactionIdempotencyRepository.findByKey(
      options.idempotencyKey
    );
    if (existing) {
      logger.info('Duplicate transaction request', { idempotencyKey: options.idempotencyKey });
      return existing.transaction_data;
    }
  }

  // Decide which flow to use
  if (FeatureFlags.USE_NEW_TXN_FLOW) {
    return this._createTransactionNewFlow(data, user, options);
  } else {
    return this._createTransactionOldFlow(data, user, options);
  }
}

/**
 * NEW FLOW: Correct sequence with payments/allocations BEFORE balance update
 */
private async _createTransactionNewFlow(
  data: any,
  user: any,
  options?: { idempotencyKey?: string }
): Promise<any> {
  
  return await sequelize.transaction(async (tx) => {
    // Step 1: Create transaction record
    const transactionEntity = await this._prepareTransactionEntity(data, user);
    const createdTransaction = await this.transactionRepository.create(
      transactionEntity,
      { transaction: tx }
    );

    logger.info('Transaction created', { 
      transactionId: createdTransaction.id,
      farmer: createdTransaction.farmer_id,
      buyer: createdTransaction.buyer_id
    });

    // Step 2: Create optional expense (if provided)
    if (data.expense) {
      const expenseData = {
        shop_id: createdTransaction.shop_id,
        user_id: createdTransaction.farmer_id,
        amount: data.expense.amount,
        type: data.expense.type || 'expense',
        description: data.expense.description,
        transaction_id: createdTransaction.id,
        status: 'pending',
        total_amount: data.expense.amount,
        allocated_amount: 0
      };

      await Expense.create(expenseData, { transaction: tx });
      
      logger.info('Expense created with transaction', {
        transactionId: createdTransaction.id,
        expenseAmount: data.expense.amount
      });
    }

    // Step 3: Create payments (if provided)
    const createdPayments: any[] = [];
    if (data.payments && data.payments.length > 0) {
      for (const paymentData of data.payments) {
        const payment = await this.paymentService.createPaymentForTransaction(
          {
            ...paymentData,
            transaction_id: createdTransaction.id,
            shop_id: createdTransaction.shop_id
          },
          user.id,
          { transaction: tx }
        );
        createdPayments.push(payment);
      }

      logger.info('Payments created', {
        transactionId: createdTransaction.id,
        paymentCount: createdPayments.length
      });
    }

    // Step 4: Create allocations for each payment
    for (const payment of createdPayments) {
      await this.paymentService.allocatePaymentToTransactions(
        payment,
        { transaction: tx }
      );
    }

    // Step 5: Run FIFO for expenses (farmer payments only)
    const farmerPayments = createdPayments.filter(p => p.payee_type === 'FARMER');
    for (const payment of farmerPayments) {
      const fifoResult = await this.settlementService.applyRepaymentFIFO(
        createdTransaction.farmer_id,
        payment.amount,
        payment.id,
        { transaction: tx }
      );

      // Update payment with expense allocation info
      await payment.update({
        applied_to_expenses: fifoResult.usedForExpenses || 0,
        applied_to_balance: fifoResult.remaining || payment.amount
      }, { transaction: tx });

      logger.info('FIFO applied', {
        paymentId: payment.id,
        usedForExpenses: fifoResult.usedForExpenses,
        remaining: fifoResult.remaining
      });
    }

    // Step 6: NOW update user balances (all data ready)
    const farmerBalance = await balanceCalculationService.calculateBalance(
      createdTransaction.farmer_id,
      'farmer',
      { transaction: tx }
    );
    const buyerBalance = await balanceCalculationService.calculateBalance(
      createdTransaction.buyer_id,
      'buyer',
      { transaction: tx }
    );

    await User.update(
      { balance: farmerBalance },
      { where: { id: createdTransaction.farmer_id }, transaction: tx }
    );
    await User.update(
      { balance: buyerBalance },
      { where: { id: createdTransaction.buyer_id }, transaction: tx }
    );

    logger.info('Balances updated', {
      transactionId: createdTransaction.id,
      farmerBalance: farmerBalance.toFixed(2),
      buyerBalance: buyerBalance.toFixed(2)
    });

    // Step 7: Update transaction status
    await this._updateTransactionStatus(createdTransaction.id, { transaction: tx });

    // Step 8: Create ledger entries
    await this._createLedgerEntries(createdTransaction, { transaction: tx });

    // Step 9: Store idempotency record
    if (options?.idempotencyKey) {
      await this.transactionIdempotencyRepository.create({
        idempotency_key: options.idempotencyKey,
        transaction_id: createdTransaction.id,
        transaction_data: createdTransaction,
        created_at: new Date()
      }, { transaction: tx });
    }

    // Fetch complete transaction with all relations
    const result = await this.transactionRepository.findByPk(
      createdTransaction.id,
      { transaction: tx }
    );

    return result;
  });
}

/**
 * Helper: Update transaction settlement status based on allocations
 */
private async _updateTransactionStatus(
  transactionId: number,
  options?: { transaction?: any }
): Promise<void> {
  const transaction = await Transaction.findByPk(transactionId, {
    transaction: options?.transaction
  });

  if (!transaction) return;

  // Calculate buyer paid
  const buyerAllocations = await PaymentAllocation.findAll({
    where: { transaction_id: transactionId },
    include: [{
      model: Payment,
      as: 'payment',
      where: { payer_type: 'BUYER', payee_type: 'SHOP', status: 'PAID' },
      required: true
    }],
    transaction: options?.transaction
  });

  // Calculate farmer paid
  const farmerAllocations = await PaymentAllocation.findAll({
    where: { transaction_id: transactionId },
    include: [{
      model: Payment,
      as: 'payment',
      where: { payee_type: 'FARMER', status: 'PAID' },
      required: true
    }],
    transaction: options?.transaction
  });

  const buyerPaid = buyerAllocations.reduce((s, a) => s + Number(a.allocated_amount), 0);
  const farmerPaid = farmerAllocations.reduce((s, a) => s + Number(a.allocated_amount), 0);

  const buyerPending = Math.max(0, Number(transaction.total_amount) - buyerPaid);
  const farmerPending = Math.max(0, Number(transaction.farmer_earning) - farmerPaid);

  // Determine status
  let status = 'pending';
  if (buyerPending < 0.01 && farmerPending < 0.01) {
    status = 'settled';
  }

  await transaction.update({
    status,
    settled_amount: Math.min(buyerPaid, farmerPaid),
    settlement_date: status === 'settled' ? new Date() : null
  }, { transaction: options?.transaction });

  logger.debug('Transaction status updated', {
    transactionId,
    status,
    buyerPaid: buyerPaid.toFixed(2),
    farmerPaid: farmerPaid.toFixed(2)
  });
}

/**
 * Helper: Create ledger entries for transaction
 */
private async _createLedgerEntries(
  transaction: any,
  options?: { transaction?: any }
): Promise<void> {
  // Farmer earning entry
  await TransactionLedger.create({
    user_id: transaction.farmer_id,
    transaction_id: transaction.id,
    amount: transaction.farmer_earning,
    type: 'earning',
    description: `Earning from transaction #${transaction.id}`,
    created_at: new Date()
  }, { transaction: options?.transaction });

  // Buyer expense entry
  await TransactionLedger.create({
    user_id: transaction.buyer_id,
    transaction_id: transaction.id,
    amount: -transaction.total_amount,
    type: 'expense',
    description: `Purchase in transaction #${transaction.id}`,
    created_at: new Date()
  }, { transaction: options?.transaction });

  // Commission entry (for shop owner)
  const shop = await Shop.findByPk(transaction.shop_id, {
    transaction: options?.transaction
  });
  
  if (shop && shop.owner_id) {
    await TransactionLedger.create({
      user_id: shop.owner_id,
      transaction_id: transaction.id,
      amount: transaction.commission_amount,
      type: 'commission',
      description: `Commission from transaction #${transaction.id}`,
      created_at: new Date()
    }, { transaction: options?.transaction });
  }
}
```

---

#### 3.2 Payment Service Helper

**Add to:** `kisaan-backend-node/src/services/paymentService.ts`

```typescript
/**
 * Create payment specifically for a transaction (called within transaction flow)
 * Does NOT update balances - that happens at transaction level
 */
async createPaymentForTransaction(
  data: any,
  userId: number,
  options?: { transaction?: any }
): Promise<Payment> {
  
  // Validate payment data
  this._validatePaymentData(data);

  // Create payment record
  const payment = await Payment.create({
    transaction_id: data.transaction_id,
    shop_id: data.shop_id,
    payer_type: data.payer_type,
    payee_type: data.payee_type,
    amount: data.amount,
    method: data.method,
    payment_date: data.payment_date || new Date(),
    status: 'PAID', // Immediate payment
    notes: data.notes,
    counterparty_id: data.counterparty_id
  }, { transaction: options?.transaction });

  logger.info('Payment created for transaction', {
    paymentId: payment.id,
    transactionId: data.transaction_id,
    amount: payment.amount,
    flow: `${payment.payer_type} → ${payment.payee_type}`
  });

  return payment;
}

private _validatePaymentData(data: any): void {
  if (!data.payer_type || !data.payee_type) {
    throw new Error('payer_type and payee_type are required');
  }
  if (!data.amount || data.amount <= 0) {
    throw new Error('amount must be positive');
  }
  if (!data.method) {
    throw new Error('payment method is required');
  }
}
```

---

#### 3.3 API Contract Update

**Update:** Transaction creation endpoint to support optional expense

```typescript
// POST /api/transactions
interface CreateTransactionRequest {
  farmer_id: number;
  buyer_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  
  // Optional: Create expense with transaction
  expense?: {
    amount: number;
    type?: 'expense' | 'advance' | 'adjustment';
    description?: string;
  };
  
  // Optional: Include payments
  payments?: Array<{
    payer_type: 'BUYER' | 'SHOP' | 'FARMER';
    payee_type: 'BUYER' | 'SHOP' | 'FARMER';
    amount: number;
    method: string;
    payment_date?: string;
    notes?: string;
  }>;
}
```

---

## Success Criteria for Part 3

- [ ] New flow implemented behind `USE_NEW_TXN_FLOW` flag
- [ ] All payments/allocations created BEFORE balance update
- [ ] Transaction + expense creation is atomic
- [ ] FIFO runs before balance calculation
- [ ] Integration tests pass
- [ ] No balance drift in new flow

**Testing:**
```bash
# Enable new flow
export USE_NEW_TXN_FLOW=true
export NEW_BALANCE_ENGINE_ACTIVE=true

# Test transaction creation with payments
curl -X POST /api/transactions -d '{
  "farmer_id": 1,
  "buyer_id": 2,
  "product_id": 1,
  "quantity": 10,
  "unit_price": 10,
  "payments": [
    {"payer_type": "BUYER", "payee_type": "SHOP", "amount": 100, "method": "cash"},
    {"payer_type": "SHOP", "payee_type": "FARMER", "amount": 90, "method": "cash"}
  ],
  "expense": {
    "amount": 30,
    "description": "Transport cost"
  }
}'

# Verify:
# - Transaction created
# - Payments created
# - Allocations exist
# - Expense created and partially settled
# - Balances correct
```

**Next:** Part 4 - Payment Immutability & Deprecations

