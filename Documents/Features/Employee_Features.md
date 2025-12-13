# Market Management System - Employee Features & User Journey

## 👨‍💼 **Employee - Complete Feature Set & Use Cases**

Based on the comprehensive ERD and business logic, this document outlines all features available to Shop Employees, with practical examples and role-based permissions.

---

## What Employee Has Access To

### Shop-Level Operations Scope
- **Daily transaction processing** within assigned permissions
- **Stock management** for current operations
- **Customer service** and support functions
- **Basic reporting** for daily activities
- **Task management** and workflow execution

### Database Entities Accessible:
- `USER` (limited to shop users - read only)
- `PRODUCT` (shop products - read only)
- `FARMER_STOCK` (current stock levels)
- `TRANSACTION` & `TRANSACTION_ITEM` (can create/modify)
- `PAYMENT` (process payments)
- `CREDIT` (view buyer credit status)
- `STOCK_ADJUSTMENT` (limited adjustment rights)
- `AUDIT_LOG` (own activities only)

---

## Employee Role Types & Permissions

### 1. Cashier/Sales Employee
#### **Primary Responsibilities:**
- Process customer transactions
- Handle payments (cash, UPI, cards)
- Manage customer interactions
- Issue receipts and documentation
- Basic inventory checks

#### **System Permissions:**
```
✅ CREATE - Transactions, Payments
✅ READ - Products, Stock levels, Customer info
✅ UPDATE - Transaction status, Payment status
❌ DELETE - Any records
❌ MODIFY - Prices, Commission rules
❌ ACCESS - Financial reports, User management
```

### 2. Stock Manager/Supervisor
#### **Primary Responsibilities:**
- Manage farmer deliveries
- Process stock adjustments
- Monitor inventory levels
- Handle returns and exchanges
- Quality control oversight

#### **System Permissions:**
```
✅ CREATE - Stock records, Adjustments
✅ READ - Full inventory data, Farmer information
✅ UPDATE - Stock quantities, Product status
✅ LIMITED DELETE - Adjustment corrections (with approval)
❌ ACCESS - Financial data, Commission settings
❌ MODIFY - User permissions, System settings
```

### 3. Floor Manager/Assistant Manager
#### **Primary Responsibilities:**
- Supervise daily operations
- Handle complex transactions
- Resolve customer disputes
- Train and manage junior employees
- Generate operational reports

#### **System Permissions:**
```
✅ CREATE - All transaction types, User records (limited)
✅ READ - Most operational data, Basic financial reports
✅ UPDATE - Transaction modifications, Stock adjustments
✅ APPROVE - Large adjustments, Returns/exchanges
❌ ACCESS - Owner-level reports, System configuration
❌ MODIFY - Commission rules, Credit limits
```

---

## Core Employee Capabilities

### 1. Daily Transaction Processing

#### **What Employees Can Do:**
- Process walk-in customer sales
- Handle both cash and credit transactions
- Manage guest buyer checkouts
- Process returns and exchanges
- Handle payment collections

#### **Practical Examples:**
```
Example 1 - Regular Sale Transaction (Cashier):
Customer buys 15kg roses:
1. Check stock availability via system
2. Select farmer stock (best quality/price)
3. Create TRANSACTION record
4. Add TRANSACTION_ITEM (15kg × ₹120 = ₹1,800)
5. Process PAYMENT (cash/UPI)
6. Generate receipt
7. Update FARMER_STOCK quantity (-15kg)

Example 2 - Credit Sale Processing:
Regular buyer wants 25kg mixed flowers on credit:
1. Verify buyer's credit limit and outstanding
2. Check: current ₹12,000 + new ₹3,000 < limit ₹50,000 ✓
3. Create TRANSACTION with payment_status='pending'
4. Create CREDIT and CREDIT_DETAIL records
5. Update buyer's outstanding balance
6. Provide credit receipt

Example 3 - Guest Buyer Transaction:
Walk-in customer (no account):
1. Create temporary GUEST user record
2. Username: GUEST_123_1724588400 (shop_id + timestamp)
3. Process cash-only transaction
4. No credit facility available
5. Issue receipt with guest transaction ID
```

#### **Transaction Validation Checks:**
- Stock availability verification
- Credit limit validation for credit sales
- Price consistency with current rates
- Commission rule application
- Payment method validation

---

### 2. Stock Management Operations

#### **What Employees Can Do:**
- Receive and record farmer deliveries
- Monitor stock levels throughout day
- Handle stock adjustments for damage/wastage
- Process returns to farmers
- Maintain quality control standards

#### **Practical Examples:**
```
Example 1 - Farmer Delivery Processing (Stock Manager):
Farmer A delivers morning stock:
1. Verify delivery quantities and quality
2. Create FARMER_STOCK records:
   - 40kg roses, status='active'
   - 30kg marigolds, status='active'
3. Update product availability for sales team
4. Notify owner of new stock via system
5. Document any quality concerns

Example 2 - Stock Adjustment for Damage:
During midday inspection, found 8kg damaged roses:
1. Create STOCK_ADJUSTMENT record
2. adjustment_qty: -8.0
3. reason: 'quality_deterioration'
4. performed_by: employee_id
5. Update FARMER_STOCK quantity (40kg → 32kg)
6. Requires manager approval for large adjustments

Example 3 - End-of-Day Stock Review:
Close-of-business procedures:
1. Check remaining FARMER_STOCK quantities
2. Assess product freshness for next day
3. Update status: 'active' → 'discarded' for spoiled items
4. Create adjustment records for wastage
5. Plan overnight storage arrangements
```

This comprehensive employee framework ensures efficient daily operations while maintaining security, compliance, and growth opportunities for staff members.loyee Features & Capabilities

## What Employee Has
- Access to assigned shop(s) and related products, transactions, and inventory
- Dashboard for daily tasks and activity tracking

## What Employee Can Do
- Record deliveries from farmers
- Record and manage sales to buyers
- Update stock levels and mark unsold/discarded products
- Record shop expenses as directed by owner
- Add comments and notes to transactions
- Assist with user onboarding and support
- View reports and analytics (as permitted)

---

Employee supports shop operations, sales, and inventory management under the owner’s supervision.
