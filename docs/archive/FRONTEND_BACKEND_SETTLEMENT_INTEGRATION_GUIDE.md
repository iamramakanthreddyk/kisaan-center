# Frontend & Backend Settlement Integration Guide

## Overview

This document outlines the complete integration plan for the new payment/expense settlement tracking system across frontend and backend.

---

## ✅ COMPLETED - Database Layer

### Migrations Applied (All Successful)
1. ✅ `20251019_01_enhance_payments_settlement.sql`
2. ✅ `20251019_02_enhance_expenses_ledger_link.sql`
3. ✅ `20251019_03_add_ledger_references.sql`
4. ✅ `20251019_04_reconciliation_functions.sql`
5. ✅ `20251019_05_transaction_settlement_tracking.sql`
6. ✅ `20251019_06_expense_allocation_tracking.sql`
7. ✅ `20251019_07_ledger_enhancements_views.sql`

### Database Objects Created
- **Tables**: `kisaan_transaction_settlements`, `kisaan_expense_allocations`
- **Views**: `v_user_settlement_summary`, `v_transaction_settlement_detail`, `v_expense_allocation_detail`
- **Functions**: `get_user_financial_picture()`, `update_transaction_settlement_status()`, `update_expense_allocation_status()`
- **Triggers**: Auto-update settlement_status and allocation_status

---

## ✅ COMPLETED - Backend Models

### 1. Transaction Model Updated
**File**: `src/models/transaction.ts`

**New Fields Added**:
```typescript
settled_amount?: number;
pending_amount?: number;
settlement_status?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
```

### 2. Expense Model Updated
**File**: `src/models/expense.ts`

**New Fields Added**:
```typescript
total_amount?: number; // Original expense amount (immutable)
allocated_amount?: number; // Amount already allocated/offset
remaining_amount?: number; // Amount not yet allocated
allocation_status?: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
```

---

## ⚠️ PENDING - Backend Changes

### 1. Create New Models

#### A. TransactionSettlement Model
**File**: `src/models/transactionSettlement.ts` (NEW)

```typescript
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface TransactionSettlementAttributes {
  id: number;
  transaction_id: number;
  settlement_type: 'PAYMENT' | 'EXPENSE_OFFSET' | 'CREDIT_OFFSET' | 'ADJUSTMENT';
  payment_id?: number | null;
  expense_id?: number | null;
  credit_id?: number | null;
  amount: number;
  settled_date: Date;
  notes?: string;
  created_by?: number | null;
  created_at: Date;
}

export interface TransactionSettlementCreationAttributes extends Optional<TransactionSettlementAttributes, 'id' | 'payment_id' | 'expense_id' | 'credit_id' | 'notes' | 'created_by' | 'created_at'> {}

export class TransactionSettlement extends Model<TransactionSettlementAttributes, TransactionSettlementCreationAttributes> implements TransactionSettlementAttributes {
  public id!: number;
  public transaction_id!: number;
  public settlement_type!: 'PAYMENT' | 'EXPENSE_OFFSET' | 'CREDIT_OFFSET' | 'ADJUSTMENT';
  public payment_id?: number | null;
  public expense_id?: number | null;
  public credit_id?: number | null;
  public amount!: number;
  public settled_date!: Date;
  public notes?: string;
  public created_by?: number | null;
  public readonly created_at!: Date;
}

TransactionSettlement.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    transaction_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_transactions', key: 'id' } },
    settlement_type: { type: DataTypes.STRING(50), allowNull: false, validate: { isIn: [['PAYMENT', 'EXPENSE_OFFSET', 'CREDIT_OFFSET', 'ADJUSTMENT']] } },
    payment_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_payments', key: 'id' } },
    expense_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_expenses', key: 'id' } },
    credit_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_transaction_ledger', key: 'id' } },
    amount: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    settled_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_users', key: 'id' } },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  {
    sequelize,
    tableName: 'kisaan_transaction_settlements',
    timestamps: false,
    indexes: [
      { fields: ['transaction_id'] },
      { fields: ['payment_id'] },
      { fields: ['expense_id'] }
    ]
  }
);

export default TransactionSettlement;
```

#### B. ExpenseAllocation Model
**File**: `src/models/expenseAllocation.ts` (NEW)

```typescript
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface ExpenseAllocationAttributes {
  id: number;
  expense_id: number;
  allocation_type: 'TRANSACTION_OFFSET' | 'BALANCE_SETTLEMENT' | 'ADVANCE_PAYMENT';
  transaction_id?: number | null;
  transaction_settlement_id?: number | null;
  allocated_amount: number;
  allocation_date: Date;
  notes?: string;
  created_by?: number | null;
  created_at: Date;
}

export interface ExpenseAllocationCreationAttributes extends Optional<ExpenseAllocationAttributes, 'id' | 'transaction_id' | 'transaction_settlement_id' | 'notes' | 'created_by' | 'created_at'> {}

export class ExpenseAllocation extends Model<ExpenseAllocationAttributes, ExpenseAllocationCreationAttributes> implements ExpenseAllocationAttributes {
  public id!: number;
  public expense_id!: number;
  public allocation_type!: 'TRANSACTION_OFFSET' | 'BALANCE_SETTLEMENT' | 'ADVANCE_PAYMENT';
  public transaction_id?: number | null;
  public transaction_settlement_id?: number | null;
  public allocated_amount!: number;
  public allocation_date!: Date;
  public notes?: string;
  public created_by?: number | null;
  public readonly created_at!: Date;
}

ExpenseAllocation.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    expense_id: { type: DataTypes.BIGINT, allowNull: false, references: { model: 'kisaan_expenses', key: 'id' } },
    allocation_type: { type: DataTypes.STRING(50), allowNull: false, validate: { isIn: [['TRANSACTION_OFFSET', 'BALANCE_SETTLEMENT', 'ADVANCE_PAYMENT']] } },
    transaction_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_transactions', key: 'id' } },
    transaction_settlement_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_transaction_settlements', key: 'id' } },
    allocated_amount: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
    allocation_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'kisaan_users', key: 'id' } },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  {
    sequelize,
    tableName: 'kisaan_expense_allocations',
    timestamps: false,
    indexes: [
      { fields: ['expense_id'] },
      { fields: ['transaction_id'] }
    ]
  }
);

export default ExpenseAllocation;
```

### 2. Create Settlement Service

**File**: `src/services/settlementTrackingService.ts` (NEW)

```typescript
import { Transaction as SequelizeTransaction } from 'sequelize';
import sequelize from '../config/database';
import { Transaction } from '../models/transaction';
import { Payment } from '../models/payment';
import { Expense } from '../models/expense';
import TransactionSettlement from '../models/transactionSettlement';
import ExpenseAllocation from '../models/expenseAllocation';
import { TransactionLedger } from '../models/transactionLedger';

export class SettlementTrackingService {
  
  /**
   * Record a payment against a transaction and create settlement record
   */
  async recordPaymentSettlement(data: {
    transaction_id: number;
    payment_id: number;
    amount: number;
    created_by: number;
    notes?: string;
  }): Promise<{ settlement: TransactionSettlement; transaction: Transaction }> {
    const t = await sequelize.transaction();
    
    try {
      // Create settlement record
      const settlement = await TransactionSettlement.create({
        transaction_id: data.transaction_id,
        settlement_type: 'PAYMENT',
        payment_id: data.payment_id,
        amount: data.amount,
        notes: data.notes,
        created_by: data.created_by,
        settled_date: new Date()
      }, { transaction: t });

      // Create ledger entry
      await TransactionLedger.create({
        transaction_id: data.transaction_id,
        user_id: data.created_by,
        amount: data.amount,
        transaction_type: 'PAYMENT',
        payment_id: data.payment_id,
        purpose: `Payment settlement: ${data.notes || ''}`,
        transaction_date: new Date()
      }, { transaction: t });

      await t.commit();

      // Trigger will auto-update transaction.settled_amount, pending_amount, settlement_status
      const transaction = await Transaction.findByPk(data.transaction_id);
      
      return { settlement, transaction: transaction! };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Offset an expense against a transaction (expense offset settlement)
   */
  async offsetExpenseAgainstTransaction(data: {
    transaction_id: number;
    expense_id: number;
    amount: number;
    created_by: number;
    notes?: string;
  }): Promise<{ allocation: ExpenseAllocation; settlement: TransactionSettlement; expense: Expense; transaction: Transaction }> {
    const t = await sequelize.transaction();
    
    try {
      // Create expense allocation
      const allocation = await ExpenseAllocation.create({
        expense_id: data.expense_id,
        allocation_type: 'TRANSACTION_OFFSET',
        transaction_id: data.transaction_id,
        allocated_amount: data.amount,
        notes: data.notes,
        created_by: data.created_by,
        allocation_date: new Date()
      }, { transaction: t });

      // Create settlement record
      const settlement = await TransactionSettlement.create({
        transaction_id: data.transaction_id,
        settlement_type: 'EXPENSE_OFFSET',
        expense_id: data.expense_id,
        amount: data.amount,
        notes: data.notes,
        created_by: data.created_by,
        settled_date: new Date()
      }, { transaction: t });

      // Update allocation with settlement link
      await allocation.update({
        transaction_settlement_id: settlement.id
      }, { transaction: t });

      // Create ledger entry
      await TransactionLedger.create({
        transaction_id: data.transaction_id,
        user_id: data.created_by,
        amount: data.amount,
        transaction_type: 'EXPENSE_OFFSET',
        expense_id: data.expense_id,
        purpose: `Expense offset: ${data.notes || ''}`,
        transaction_date: new Date()
      }, { transaction: t });

      await t.commit();

      // Triggers will auto-update:
      // - expense.allocated_amount, remaining_amount, allocation_status
      // - transaction.settled_amount, pending_amount, settlement_status
      const expense = await Expense.findByPk(data.expense_id);
      const transaction = await Transaction.findByPk(data.transaction_id);
      
      return { allocation, settlement, expense: expense!, transaction: transaction! };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get transaction settlement breakdown
   */
  async getTransactionSettlementDetail(transaction_id: number): Promise<any> {
    const [result] = await sequelize.query(`
      SELECT * FROM v_transaction_settlement_detail 
      WHERE transaction_id = :transaction_id
    `, {
      replacements: { transaction_id },
      type: 'SELECT'
    });

    return result;
  }

  /**
   * Get expense allocation breakdown
   */
  async getExpenseAllocationDetail(expense_id: number): Promise<any> {
    const [result] = await sequelize.query(`
      SELECT * FROM v_expense_allocation_detail 
      WHERE expense_id = :expense_id
    `, {
      replacements: { expense_id },
      type: 'SELECT'
    });

    return result;
  }

  /**
   * Get user financial picture
   */
  async getUserFinancialPicture(user_id: number): Promise<any> {
    const [result] = await sequelize.query(`
      SELECT * FROM get_user_financial_picture(:user_id)
    `, {
      replacements: { user_id },
      type: 'SELECT'
    });

    return result[0];
  }

  /**
   * Get all settlements for a transaction
   */
  async getTransactionSettlements(transaction_id: number): Promise<TransactionSettlement[]> {
    return await TransactionSettlement.findAll({
      where: { transaction_id },
      include: [
        { model: Payment, as: 'payment', required: false },
        { model: Expense, as: 'expense', required: false }
      ],
      order: [['settled_date', 'DESC']]
    });
  }

  /**
   * Get all allocations for an expense
   */
  async getExpenseAllocations(expense_id: number): Promise<ExpenseAllocation[]> {
    return await ExpenseAllocation.findAll({
      where: { expense_id },
      include: [
        { model: Transaction, as: 'transaction', required: false }
      ],
      order: [['allocation_date', 'DESC']]
    });
  }
}

export default new SettlementTrackingService();
```

### 3. Add Controller Endpoints

#### A. TransactionController Updates

**File**: `src/controllers/transactionController.ts`

Add these methods:

```typescript
/**
 * GET /transactions/:id/settlement - Get settlement detail for a transaction
 */
async getTransactionSettlement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transactionId = parseId(id, 'transaction id');
    
    const settlementDetail = await settlementTrackingService.getTransactionSettlementDetail(transactionId);
    
    return success(res, settlementDetail, { message: 'Transaction settlement retrieved' });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'transaction:settlement:get failed');
    const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to get settlement';
    return failureCode(res, 500, ErrorCodes.GET_TRANSACTION_SETTLEMENT_FAILED, { error: message });
  }
}

/**
 * POST /transactions/:id/offset-expense - Offset an expense against transaction
 * Body: { expense_id: number, amount: number, notes?: string }
 */
async offsetExpenseAgainstTransaction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transactionId = parseId(id, 'transaction id');
    const { expense_id, amount, notes } = req.body;
    
    if (!expense_id || !amount) {
      return failureCode(res, 400, ErrorCodes.VALIDATION_ERROR, { required: ['expense_id', 'amount'] }, 'expense_id and amount are required');
    }
    
    const user = (req as any).user;
    const userId = user?.id || 1;
    
    const result = await settlementTrackingService.offsetExpenseAgainstTransaction({
      transaction_id: transactionId,
      expense_id: parseId(String(expense_id), 'expense id'),
      amount: parseFloat(amount),
      created_by: userId,
      notes
    });
    
    return success(res, result, { message: 'Expense offset against transaction successfully' });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'transaction:offset-expense failed');
    const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to offset expense';
    return failureCode(res, 500, ErrorCodes.EXPENSE_OFFSET_FAILED, { error: message });
  }
}
```

#### B. ExpenseController Updates

**File**: `src/controllers/expenseController.ts`

Add these methods:

```typescript
/**
 * GET /expenses/:id/allocation - Get allocation detail for an expense
 */
async getExpenseAllocation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const expenseId = parseId(id, 'expense id');
    
    const allocationDetail = await settlementTrackingService.getExpenseAllocationDetail(expenseId);
    
    return success(res, allocationDetail, { message: 'Expense allocation retrieved' });
  } catch (error: unknown) {
    req.log?.error({ err: error }, 'expense:allocation:get failed');
    const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'Failed to get allocation';
    return failureCode(res, 500, ErrorCodes.GET_EXPENSE_ALLOCATION_FAILED, { error: message });
  }
}
```

### 4. Add Routes

#### Update transactionRoutes.ts:

```typescript
// Settlement endpoints
router.get('/:id/settlement', authenticateToken, transactionController.getTransactionSettlement.bind(transactionController));
router.post('/:id/offset-expense', authenticateToken, transactionController.offsetExpenseAgainstTransaction.bind(transactionController));
```

#### Update expenseRoutes.ts:

```typescript
// Allocation endpoints
router.get('/:id/allocation', authenticateToken, expenseController.getExpenseAllocation.bind(expenseController));
```

---

## ⚠️ PENDING - Frontend Changes

### 1. Update TypeScript Types

**File**: `kisaan-frontend/src/types/transaction.ts`

```typescript
export interface Transaction {
  id: number;
  shop_id: number;
  farmer_id: number;
  buyer_id: number;
  category_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_amount: number;
  farmer_earning: number;
  product_id?: number | null;
  commission_rate?: number | null;
  commission_type?: string | null;
  status?: string;
  transaction_date?: string | null;
  settlement_date?: string | null;
  notes?: string | null;
  
  // Settlement tracking fields (NEW)
  settled_amount?: number;
  pending_amount?: number;
  settlement_status?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
  
  created_at?: string;
  updated_at?: string;
}
```

**File**: `kisaan-frontend/src/types/expense.ts`

```typescript
export interface Expense {
  id: number;
  shop_id?: number | null;
  user_id: number;
  amount: number;
  type: 'expense' | 'advance' | 'adjustment';
  description?: string;
  transaction_id?: number | null;
  status: 'pending' | 'settled';
  
  // Allocation tracking fields (NEW)
  total_amount?: number;
  allocated_amount?: number;
  remaining_amount?: number;
  allocation_status?: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
  
  created_at?: string;
  updated_at?: string;
}
```

### 2. Add API Methods

**File**: `kisaan-frontend/src/services/api.ts`

Add to transactionApi:

```typescript
export const transactionApi = {
  // ... existing methods ...
  
  getSettlement: (id: number): Promise<ApiResponse<any>> =>
    apiClient.get(`${TRANSACTION_ENDPOINTS.BASE}/${id}/settlement`),
  
  offsetExpense: (id: number, data: {
    expense_id: number;
    amount: number;
    notes?: string;
  }): Promise<ApiResponse<any>> =>
    apiClient.post(`${TRANSACTION_ENDPOINTS.BASE}/${id}/offset-expense`, data),
};
```

Add to expenseApi:

```typescript
export const expenseApi = {
  // ... existing methods ...
  
  getAllocation: (id: number): Promise<ApiResponse<any>> =>
    apiClient.get(`${EXPENSE_ENDPOINTS.BASE}/${id}/allocation`),
};
```

### 3. Update Transaction Detail Component

**File**: `kisaan-frontend/src/components/TransactionDetail.tsx` (or similar)

Add settlement breakdown section:

```tsx
// Settlement Status Display
{transaction.settlement_status && (
  <div className="settlement-section">
    <h3>Settlement Status</h3>
    <div className="settlement-summary">
      <div className="stat">
        <label>Total Amount:</label>
        <span>₹{transaction.total_amount}</span>
      </div>
      <div className="stat">
        <label>Settled Amount:</label>
        <span>₹{transaction.settled_amount || 0}</span>
      </div>
      <div className="stat">
        <label>Pending Amount:</label>
        <span>₹{transaction.pending_amount || 0}</span>
      </div>
      <div className="stat">
        <label>Status:</label>
        <span className={`status-badge ${transaction.settlement_status?.toLowerCase()}`}>
          {transaction.settlement_status}
        </span>
      </div>
    </div>
    
    {/* Button to offset expense if pending */}
    {transaction.pending_amount && transaction.pending_amount > 0 && (
      <button 
        onClick={() => setShowOffsetExpenseModal(true)}
        className="btn-primary"
      >
        Offset Expense Against This Transaction
      </button>
    )}
  </div>
)}
```

### 4. Update Expense Detail Component

**File**: `kisaan-frontend/src/components/ExpenseDetail.tsx` (or similar)

Add allocation status section:

```tsx
// Allocation Status Display
{expense.allocation_status && (
  <div className="allocation-section">
    <h3>Allocation Status</h3>
    <div className="allocation-summary">
      <div className="stat">
        <label>Total Amount:</label>
        <span>₹{expense.total_amount}</span>
      </div>
      <div className="stat">
        <label>Allocated Amount:</label>
        <span>₹{expense.allocated_amount || 0}</span>
      </div>
      <div className="stat">
        <label>Remaining Amount:</label>
        <span>₹{expense.remaining_amount || 0}</span>
      </div>
      <div className="stat">
        <label>Status:</label>
        <span className={`status-badge ${expense.allocation_status?.toLowerCase()}`}>
          {expense.allocation_status}
        </span>
      </div>
    </div>
  </div>
)}
```

---

## 📋 Implementation Checklist

### Backend
- [ ] Create `TransactionSettlement` model
- [ ] Create `ExpenseAllocation` model
- [ ] Create `SettlementTrackingService`
- [ ] Add settlement endpoints to `TransactionController`
- [ ] Add allocation endpoints to `ExpenseController`
- [ ] Add routes for settlement endpoints
- [ ] Update error codes enum with new codes
- [ ] Test settlement flow end-to-end
- [ ] Test expense offset flow end-to-end

### Frontend
- [ ] Update `Transaction` type with settlement fields
- [ ] Update `Expense` type with allocation fields
- [ ] Add settlement API methods to `transactionApi`
- [ ] Add allocation API methods to `expenseApi`
- [ ] Update transaction detail component UI
- [ ] Update expense detail component UI
- [ ] Create offset expense modal/dialog
- [ ] Add settlement status badges/indicators
- [ ] Test UI flows

---

## 🧪 Testing Scenarios

### Scenario 1: Partial Payment
1. Create transaction for ₹1000
2. Record payment of ₹400
3. Verify `settled_amount` = ₹400, `pending_amount` = ₹600
4. Verify `settlement_status` = 'PARTIALLY_SETTLED'
5. Verify settlement record created with `settlement_type` = 'PAYMENT'

### Scenario 2: Expense Offset
1. Create transaction for ₹1000 with ₹400 payment (₹600 pending)
2. Create expense of ₹200
3. Offset expense against transaction
4. Verify transaction `settled_amount` = ₹600, `pending_amount` = ₹400
5. Verify expense `allocated_amount` = ₹200, `allocation_status` = 'FULLY_ALLOCATED'
6. Verify settlement record created with `settlement_type` = 'EXPENSE_OFFSET'
7. Verify allocation record created with `allocation_type` = 'TRANSACTION_OFFSET'

### Scenario 3: Full Settlement
1. Create transaction for ₹1000 with ₹400 payment + ₹200 expense offset (₹400 pending)
2. Record final payment of ₹400
3. Verify `settled_amount` = ₹1000, `pending_amount` = ₹0
4. Verify `settlement_status` = 'FULLY_SETTLED'

---

## 📚 API Reference

### GET /api/transactions/:id/settlement
Get settlement breakdown for a transaction.

**Response**:
```json
{
  "transaction_id": 1,
  "total_amount": 1000.00,
  "settled_amount": 600.00,
  "pending_amount": 400.00,
  "settlement_status": "PARTIALLY_SETTLED",
  "settled_via_payments": 400.00,
  "payment_count": 1,
  "settled_via_expenses": 200.00,
  "expense_offset_count": 1,
  "settled_via_credits": 0.00,
  "credit_offset_count": 0
}
```

### POST /api/transactions/:id/offset-expense
Offset an expense against a transaction.

**Request Body**:
```json
{
  "expense_id": 5,
  "amount": 200.00,
  "notes": "Transport expense offset"
}
```

**Response**:
```json
{
  "allocation": { ... },
  "settlement": { ... },
  "expense": {
    "id": 5,
    "allocated_amount": 200.00,
    "remaining_amount": 0.00,
    "allocation_status": "FULLY_ALLOCATED"
  },
  "transaction": {
    "id": 1,
    "settled_amount": 600.00,
    "pending_amount": 400.00,
    "settlement_status": "PARTIALLY_SETTLED"
  }
}
```

### GET /api/expenses/:id/allocation
Get allocation breakdown for an expense.

**Response**:
```json
{
  "expense_id": 5,
  "total_amount": 200.00,
  "allocated_amount": 200.00,
  "remaining_amount": 0.00,
  "allocation_status": "FULLY_ALLOCATED",
  "allocated_to_transactions": 200.00,
  "transaction_offset_count": 1,
  "allocated_to_balance": 0.00,
  "balance_settlement_count": 0
}
```

---

**Date**: October 19, 2025
**Status**: Database Layer Complete | Backend Models Updated | Service & Controller Implementation Pending
