# Market Management System - Business Rules & Logic

## 🧠 **Core Business Logic Documentation**

This document contains all business rules, validation logic, and workflow processes for the Market Management System.

---

## User Management Rules

### User Roles & Permissions

#### SUPERADMIN
- **System-wide access** to all shops, users, and data
- Can create/modify shops, plans, and system configurations
- Has override permissions for all operations
- Cannot be deleted or suspended by other users

#### OWNER
- **Shop-level access** to their assigned shop(s)
- Can manage users (farmers, buyers, employees) within their shop
- Full access to transactions, stock, payments, and reports
- Can configure shop settings and commission rules

#### EMPLOYEE
- **Limited shop access** based on assigned permissions
- Can process transactions and manage daily operations
- Cannot access financial reports or user management
- Actions are logged for audit purposes

#### FARMER
- **Personal data access** only to their own deliveries and payments
- Can view stock status and sales for their products
- Can request payments and view payment history
- Cannot modify transaction data

#### BUYER
- **Personal transaction access** to their purchase history
- Can view outstanding credits and payment due dates
- Can make purchases and payments
- Cannot access other buyers' data

#### GUEST
- **Temporary access** for walk-in customers
- Created automatically per shop with format: `GUEST_{shop_id}_{timestamp}`
- No persistent data - converted to regular buyer if they register
- No history merging when converting from guest to registered user

---

## Stock Management Rules

### Farmer Stock Lifecycle

#### 1. Stock Delivery
```
FARMER → delivers products → FARMER_STOCK created (status: 'active')
- Record: quantity, product, farmer, delivery date
- Validation: quantity > 0
- Auto-generate: stock ID, timestamps
```

#### 2. Stock Sale Process
```
BUYER purchases → TRANSACTION_ITEM created → FARMER_STOCK.quantity reduced
- Validation: sufficient stock available
- Update: farmer_stock.quantity -= sold_quantity
- If quantity = 0: farmer_stock.status = 'closed'
```

#### 3. Stock Adjustments
```
OWNER/EMPLOYEE → adjusts stock → STOCK_ADJUSTMENT created
- Reasons: 'damaged', 'expired', 'returned_to_farmer', 'correction'
- Approval: required for adjustments > configured limit
- Audit: all adjustments logged with reason and performer
```

#### 4. Stock Status Transitions
```
'active' → 'closed' (sold out)
'active' → 'discarded' (damaged/expired)
'active' → 'returned' (sent back to farmer)
- No reverse transitions allowed
- All status changes logged in audit trail
```

---

## Transaction & Payment Rules

### Transaction Processing

#### 1. Sale Transaction Flow
```
1. Validate buyer credit limit (if credit purchase)
2. Check stock availability for each item
3. Apply commission rules and calculate amounts
4. Create TRANSACTION and TRANSACTION_ITEM records
5. Update FARMER_STOCK quantities
6. Create CREDIT records (if credit sale)
7. Process PAYMENT (if immediate payment)
8. Log all operations in AUDIT_LOG
```

#### 2. Credit Management
```
Credit Limit Check:
current_outstanding + new_transaction_amount <= user.credit_limit

Credit Breakdown:
CREDIT → total amount owed by buyer
CREDIT_DETAIL → amount owed per farmer per product

Example:
Buyer owes ₹1000 to Farmer A (tomatoes) + ₹2000 to Farmer B (flowers)
CREDIT.amount = ₹3000
CREDIT_DETAIL: 2 records for detailed breakdown
```

#### 3. Payment Processing
```
Full Payment: payment.amount = transaction.total
Partial Payment: payment.amount < credit.amount, credit.status = 'partial'
Credit Payment: payment.amount = 0, credit created

Payment Allocation:
- Payments applied to oldest credits first (FIFO)
- Update credit.status based on remaining balance
- Log all payment applications
```

### Return & Exchange Rules

#### 1. Return Process
```
Original Transaction → Return Transaction (parent_transaction_id linked)
- Restore FARMER_STOCK quantities
- Reverse commission calculations
- Create refund PAYMENT records
- Update buyer credit if applicable
```

#### 2. Exchange Process
```
Original Transaction → Exchange Transaction
- Return items: restore stock, reverse payments
- New items: follow normal sale process
- Net difference: additional payment or refund
```

---

## Commission Management

### Commission Calculation Rules

#### 1. Flat Rate Commission
```sql
-- Example: 5% flat rate on all sales
commission_amount = transaction_total * (commission_rate / 100)

COMMISSION_RULE:
- rule_type: 'flat'
- rate: 5.00
- min_qty: NULL
- max_qty: NULL
```

#### 2. Slab-based Commission
```sql
-- Example: 3% for 0-100kg, 5% for 100-500kg, 7% for >500kg
commission_rate = get_slab_rate(total_quantity)

COMMISSION_RULE (multiple records):
- Slab 1: rate=3.00, min_qty=0, max_qty=100
- Slab 2: rate=5.00, min_qty=100, max_qty=500
- Slab 3: rate=7.00, min_qty=500, max_qty=NULL
```

#### 3. Commission Storage
```
Store at Transaction Time:
- TRANSACTION.commission_rate (rate applied)
- TRANSACTION.commission_amount (calculated amount)

Reason: Historical accuracy when rules change
```

---

## Financial Management Rules

### Farmer Payment Rules

#### 1. Advance Payments
```sql
FARMER_PAYMENT:
- payment_type: 'advance'
- transaction_id: NULL (not tied to specific sale)
- farmer_stock_id: NULL (general advance)
- amount: advance amount
```

#### 2. Settlement Payments
```sql
FARMER_PAYMENT:
- payment_type: 'settlement'
- transaction_id: specific sale transaction
- farmer_stock_id: specific stock batch
- amount: final settlement after commission deduction
```

#### 3. Payment Calculation
```
Farmer Settlement = Sale Amount - Commission - Previous Advances
Example:
Sale: ₹10,000
Commission (5%): ₹500
Previous Advances: ₹2,000
Settlement: ₹10,000 - ₹500 - ₹2,000 = ₹7,500
```

### Expense Management

#### 1. Expense Categories
```
Predefined categories:
- wage (employee salaries)
- rent (shop/storage rent)
- utility (electricity, water)
- transport (delivery costs)
- other (miscellaneous)
```

#### 2. Expense Tracking
```
All expenses recorded with:
- amount, category, date, remarks
- approval required for amounts > limit
- monthly/annual budget tracking
```

---

## Audit & Compliance Rules

### Audit Trail Requirements

#### 1. Mandatory Logging
```
Log ALL operations for:
- TRANSACTION (create, update, delete)
- FARMER_PAYMENT (create, update)
- CREDIT & CREDIT_DETAIL (create, update, delete)
- STOCK_ADJUSTMENT (create)
- USER (create, update, delete)
```

#### 2. Audit Log Structure
```json
{
  "entity_type": "TRANSACTION",
  "entity_id": 12345,
  "user_id": 67890,
  "action": "UPDATE",
  "old_data": {...},
  "new_data": {...},
  "timestamp": "2025-08-25T10:30:00Z"
}
```

### Data Validation Rules

#### 1. Input Validation
```
- Quantities: must be positive numbers
- Prices: must be positive with max 2 decimal places
- Dates: cannot be future dates (except scheduled items)
- Phone numbers: valid format with country code
- Credit limits: positive numbers, reasonable maximums
```

#### 2. Business Logic Validation
```
- Stock availability before sale
- Credit limit before credit purchase
- User permissions before operations
- Commission rate ranges (0-100%)
- Payment amount <= outstanding amount
```

---

## Guest User Management

### Guest Creation Rules

#### 1. Automatic Guest Creation
```
When walk-in customer makes purchase:
1. Create USER with role='guest'
2. Username: 'GUEST_{shop_id}_{unix_timestamp}'
3. No persistent contact information required
4. Temporary credit limit: 0 (cash only)
```

#### 2. Guest to Regular User Conversion
```
If guest wants to register:
1. Create NEW USER record with provided details
2. DO NOT merge transaction history from guest
3. Guest record remains for audit purposes
4. New user starts with clean slate
```

### Guest Limitations
- Cannot have credit purchases (credit_limit = 0)
- Cannot access system after session ends
- Cannot view historical data
- Cannot make returns/exchanges after session

---

## Performance & Scalability Rules

### Query Optimization

#### 1. Efficient Queries
```sql
-- Good: Use indexes
SELECT * FROM TRANSACTION WHERE shop_id = 123 AND date >= '2025-08-01';

-- Bad: Avoid full table scans
SELECT * FROM TRANSACTION WHERE MONTH(date) = 8;
```

#### 2. Pagination
```
- Limit query results to 50-100 records per page
- Use OFFSET and LIMIT for large datasets
- Implement server-side pagination for reports
```

### Caching Strategy
- Cache frequently accessed reference data (categories, payment methods)
- Cache user permissions and roles
- Implement Redis for session management
- Cache commission rules per shop

---

## Error Handling & Recovery

### Transaction Failures
- All database operations within transactions
- Rollback on any validation failure
- Retry logic for temporary failures
- Error logging with context information

### Data Consistency
- Foreign key constraints enforced
- Referential integrity maintained
- Periodic data validation jobs
- Backup and recovery procedures

This business logic ensures consistent, reliable, and scalable operations across all system components.
