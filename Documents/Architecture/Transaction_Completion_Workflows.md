# Transaction Completion Workflows & Payment Status Tracking

## 🎯 **Document Overview**

This document defines the complete transaction lifecycle with checkpoint-based completion tracking, ensuring all parties (farmer, buyer, shop) are properly handled before transaction finalization.

**📋 Related Documentation:**
- [ERD](./ERD.md) - Core database design
- [Business Rules](./Business_Rules.md) - Validation and business logic
- [Business Workflows](./Business_Workflows.md) - Process flows

---

## Core Transaction Completion Concept

### **Three-Party Completion Model**
Every transaction involves THREE distinct payment flows that must be tracked independently:

1. **🚚 BUYER PAYMENT** → Shop receives money from buyer
2. **👨‍🌾 FARMER PAYMENT** → Shop pays money to farmer  
3. **🏪 COMMISSION COLLECTION** → Shop confirms commission received

**✅ Transaction is complete ONLY when all three checkboxes are ticked**

---

## Example Scenario Breakdown

### **Base Transaction:**
- **Farmer A** sells **10kg product** at **₹100/kg** to **Buyer B**
- **Total Sale:** ₹1,000
- **Commission Rate:** 10%
- **Commission Amount:** ₹100  
- **Farmer Settlement:** ₹900

### **Database Records Created:**

```sql
-- 1. TRANSACTION record
INSERT INTO TRANSACTION (
    shop_id, buyer_user_id, commission_rate, commission_amount,
    status, payment_status
) VALUES (
    1, buyer_b_id, 10.00, 100.00,
    'pending', 'pending'
);

-- 2. TRANSACTION_ITEM record  
INSERT INTO TRANSACTION_ITEM (
    transaction_id, farmer_stock_id, quantity, price
) VALUES (
    txn_id, farmer_a_stock_id, 10.00, 100.00
);
```

---

## Transaction Status Tracking Model

### **Enhanced TRANSACTION Table Structure**

```sql
-- Existing fields (from ERD)
TRANSACTION {
    id, shop_id, buyer_user_id, commission_rate, commission_amount,
    status, payment_status, date, created_at, updated_at
}

-- REQUIRED ADDITIONS for Completion Tracking:
ALTER TABLE TRANSACTION ADD COLUMN buyer_paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE TRANSACTION ADD COLUMN farmer_paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE TRANSACTION ADD COLUMN commission_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE TRANSACTION ADD COLUMN completion_status VARCHAR(20) DEFAULT 'pending';

-- Completion status options:
-- 'pending' - Initial state
-- 'partial' - Some payments made
-- 'complete' - All three checkboxes ticked
-- 'cancelled' - Transaction cancelled
```

### **Three-Checkbox Completion Tracking**

```sql
-- Checkbox 1: Buyer Payment Status
CASE 
    WHEN buyer_paid_amount >= (SELECT SUM(quantity * price) FROM TRANSACTION_ITEM WHERE transaction_id = t.id)
    THEN '✅ Buyer Paid Full'
    WHEN buyer_paid_amount > 0 
    THEN '🟡 Buyer Paid Partial'
    ELSE '❌ Buyer Not Paid'
END as buyer_payment_status

-- Checkbox 2: Farmer Payment Status  
CASE
    WHEN farmer_paid_amount >= (total_amount - commission_amount)
    THEN '✅ Farmer Paid Full'
    WHEN farmer_paid_amount > 0
    THEN '🟡 Farmer Paid Partial' 
    ELSE '❌ Farmer Not Paid'
END as farmer_payment_status

-- Checkbox 3: Commission Confirmation
CASE
    WHEN commission_confirmed = TRUE
    THEN '✅ Commission Confirmed'
    ELSE '❌ Commission Pending'
END as commission_status
```

---

## Detailed Scenario Workflows

### **Scenario 1: Complete Transaction (All Checkboxes Ticked)**

#### **Step-by-Step Process:**

```sql
-- Initial transaction (₹1,000 sale, ₹100 commission, ₹900 to farmer)
-- Status: buyer_paid_amount=0, farmer_paid_amount=0, commission_confirmed=FALSE

-- Step 1: Buyer pays full amount to shop
INSERT INTO PAYMENT (
    transaction_id, amount, type, status
) VALUES (1, 1000.00, 'buyer_payment', 'completed');

UPDATE TRANSACTION 
SET buyer_paid_amount = 1000.00
WHERE id = 1;

-- Checkbox 1: ✅ Buyer Paid Full

-- Step 2: Shop pays farmer settlement
INSERT INTO FARMER_PAYMENT (
    transaction_id, farmer_user_id, amount, payment_type
) VALUES (1, farmer_a_id, 900.00, 'settlement');

UPDATE TRANSACTION 
SET farmer_paid_amount = 900.00
WHERE id = 1;

-- Checkbox 2: ✅ Farmer Paid Full

-- Step 3: Owner confirms commission received
UPDATE TRANSACTION 
SET commission_confirmed = TRUE,
    completion_status = 'complete'
WHERE id = 1;

-- Checkbox 3: ✅ Commission Confirmed
-- RESULT: Transaction Complete ✅✅✅
```

#### **UI Display:**
```
Transaction #1001 - Farmer A to Buyer B (₹1,000)

Payment Status:
✅ Buyer Payment: ₹1,000 / ₹1,000 (Complete)
✅ Farmer Payment: ₹900 / ₹900 (Complete) 
✅ Commission: ₹100 (Confirmed by Owner)

Status: COMPLETE ✅
```

---

### **Scenario 2: No Payments Made**

```sql
-- Transaction created but no payments processed
-- Status: buyer_paid_amount=0, farmer_paid_amount=0, commission_confirmed=FALSE

-- Checkbox status:
-- ❌ Buyer Payment: ₹0 / ₹1,000 (Pending)
-- ❌ Farmer Payment: ₹0 / ₹900 (Pending)
-- ❌ Commission: ₹100 (Not Confirmed)

-- completion_status = 'pending'
```

#### **UI Display:**
```
Transaction #1001 - Farmer A to Buyer B (₹1,000)

Payment Status:
❌ Buyer Payment: ₹0 / ₹1,000 (Pending)
❌ Farmer Payment: ₹0 / ₹900 (Pending)
❌ Commission: ₹100 (Pending Owner Confirmation)

Status: PENDING ❌❌❌
Actions: [Collect from Buyer] [Pay Farmer] [Confirm Commission]
```

---

### **Scenario 3: Partial Payments**

#### **3A: Buyer Partial, Farmer Partial, Commission Proportional**

```sql
-- Buyer pays partial amount
INSERT INTO PAYMENT (
    transaction_id, amount, type, status
) VALUES (1, 600.00, 'buyer_payment', 'completed');

UPDATE TRANSACTION 
SET buyer_paid_amount = 600.00
WHERE id = 1;

-- Shop pays farmer proportional amount
-- Farmer gets: (600/1000) * 900 = ₹540
INSERT INTO FARMER_PAYMENT (
    transaction_id, farmer_user_id, amount, payment_type
) VALUES (1, farmer_a_id, 540.00, 'partial_settlement');

UPDATE TRANSACTION 
SET farmer_paid_amount = 540.00
WHERE id = 1;

-- Commission calculation: (600/1000) * 100 = ₹60 earned
-- Owner confirms partial commission
UPDATE TRANSACTION 
SET commission_confirmed = TRUE,  -- Owner confirms the ₹60 earned
    completion_status = 'partial'
WHERE id = 1;
```

#### **UI Display:**
```
Transaction #1001 - Farmer A to Buyer B (₹1,000)

Payment Status:
🟡 Buyer Payment: ₹600 / ₹1,000 (60% paid, ₹400 remaining)
🟡 Farmer Payment: ₹540 / ₹900 (60% paid, ₹360 remaining)
✅ Commission: ₹60 / ₹100 (60% confirmed, ₹40 pending)

Status: PARTIAL 🟡🟡✅
Actions: [Collect ₹400 from Buyer] [Pay ₹360 to Farmer]
```

#### **3B: Complex Partial Scenario**

```sql
-- Buyer pays ₹800, Farmer gets advance ₹200, then additional ₹400
-- Commission confirmed for received portion

-- Step 1: Buyer partial payment
UPDATE TRANSACTION SET buyer_paid_amount = 800.00 WHERE id = 1;

-- Step 2: Farmer gets total ₹600 (advance + settlement)
UPDATE TRANSACTION SET farmer_paid_amount = 600.00 WHERE id = 1;

-- Step 3: Commission confirmed for ₹800 received = ₹80 commission
UPDATE TRANSACTION 
SET commission_confirmed = TRUE,
    completion_status = 'partial' 
WHERE id = 1;

-- Remaining: ₹200 from buyer, ₹300 to farmer, ₹20 commission
```

---

## Business Rules for Transaction Completion

### **1. Payment Validation Rules**

```sql
-- Buyer payment cannot exceed transaction total
CONSTRAINT chk_buyer_payment_limit 
CHECK (buyer_paid_amount <= (
    SELECT SUM(quantity * price) FROM TRANSACTION_ITEM 
    WHERE transaction_id = TRANSACTION.id
));

-- Farmer payment cannot exceed settlement amount
CONSTRAINT chk_farmer_payment_limit
CHECK (farmer_paid_amount <= (
    (SELECT SUM(quantity * price) FROM TRANSACTION_ITEM 
     WHERE transaction_id = TRANSACTION.id) - commission_amount
));

-- Commission can only be confirmed if some payment received
CONSTRAINT chk_commission_logic
CHECK (
    (commission_confirmed = FALSE) OR 
    (commission_confirmed = TRUE AND buyer_paid_amount > 0)
);
```

### **2. Completion Status Auto-Calculation**

```sql
-- Function to update completion status automatically
CREATE OR REPLACE FUNCTION update_completion_status(txn_id INT) 
RETURNS TEXT AS $$
DECLARE
    total_amount DECIMAL(12,2);
    expected_farmer_amount DECIMAL(12,2);
    current_buyer_paid DECIMAL(12,2);
    current_farmer_paid DECIMAL(12,2);
    commission_confirmed BOOLEAN;
BEGIN
    -- Calculate amounts
    SELECT 
        (SELECT SUM(quantity * price) FROM TRANSACTION_ITEM WHERE transaction_id = txn_id),
        commission_amount,
        buyer_paid_amount,
        farmer_paid_amount,
        commission_confirmed
    INTO total_amount, commission_amount, current_buyer_paid, current_farmer_paid, commission_confirmed
    FROM TRANSACTION WHERE id = txn_id;
    
    expected_farmer_amount := total_amount - commission_amount;
    
    -- Determine status
    IF current_buyer_paid >= total_amount AND 
       current_farmer_paid >= expected_farmer_amount AND 
       commission_confirmed = TRUE THEN
        UPDATE TRANSACTION SET completion_status = 'complete' WHERE id = txn_id;
        RETURN 'complete';
    ELSIF current_buyer_paid > 0 OR current_farmer_paid > 0 OR commission_confirmed = TRUE THEN
        UPDATE TRANSACTION SET completion_status = 'partial' WHERE id = txn_id;
        RETURN 'partial';
    ELSE
        UPDATE TRANSACTION SET completion_status = 'pending' WHERE id = txn_id;
        RETURN 'pending';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### **3. Owner Dashboard Queries**

```sql
-- Transactions requiring owner attention
SELECT 
    t.id,
    t.commission_amount,
    t.buyer_paid_amount,
    t.farmer_paid_amount,
    t.commission_confirmed,
    t.completion_status,
    CASE 
        WHEN NOT t.commission_confirmed AND t.buyer_paid_amount > 0 
        THEN 'Confirm Commission'
        WHEN t.buyer_paid_amount < (SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id)
        THEN 'Collect from Buyer'
        WHEN t.farmer_paid_amount < ((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.commission_amount)
        THEN 'Pay Farmer'
        ELSE 'Complete'
    END as next_action
FROM TRANSACTION t
WHERE t.completion_status IN ('pending', 'partial')
ORDER BY t.date DESC;

-- Commission confirmation pending
SELECT 
    t.id,
    t.commission_amount,
    (t.buyer_paid_amount / (SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) * 100) as payment_percentage,
    (t.buyer_paid_amount * t.commission_rate / 100) as commission_earned
FROM TRANSACTION t
WHERE t.commission_confirmed = FALSE 
  AND t.buyer_paid_amount > 0;
```

---

## ERD Compatibility Analysis

### **✅ CURRENT ERD SUPPORTS:**

1. **Transaction tracking** - ✅ TRANSACTION table exists
2. **Payment recording** - ✅ PAYMENT and FARMER_PAYMENT tables exist  
3. **Commission calculation** - ✅ commission_rate and commission_amount fields exist
4. **Status tracking** - ✅ status and payment_status fields exist

### **🔧 REQUIRED ENHANCEMENTS:**

```sql
-- Add to TRANSACTION table for completion tracking
ALTER TABLE TRANSACTION ADD COLUMN buyer_paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE TRANSACTION ADD COLUMN farmer_paid_amount DECIMAL(12,2) DEFAULT 0; 
ALTER TABLE TRANSACTION ADD COLUMN commission_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE TRANSACTION ADD COLUMN completion_status VARCHAR(20) DEFAULT 'pending';

-- Add triggers to auto-update amounts when payments are made
CREATE TRIGGER update_buyer_paid_amount 
AFTER INSERT ON PAYMENT 
FOR EACH ROW 
EXECUTE FUNCTION sync_buyer_payment_amount();

CREATE TRIGGER update_farmer_paid_amount
AFTER INSERT ON FARMER_PAYMENT
FOR EACH ROW
EXECUTE FUNCTION sync_farmer_payment_amount();
```

### **📱 UI Implementation Requirements**

```typescript
// Transaction completion component
interface TransactionCompletion {
  transactionId: number;
  totalAmount: number;
  commissionAmount: number;
  farmerSettlementAmount: number;
  
  // Status tracking
  buyerPaidAmount: number;
  farmerPaidAmount: number;
  commissionConfirmed: boolean;
  
  // Completion status
  completionStatus: 'pending' | 'partial' | 'complete' | 'cancelled';
  
  // Actions available
  availableActions: Array<'collect_from_buyer' | 'pay_farmer' | 'confirm_commission'>;
}

// Checkbox component
const TransactionCheckboxes = ({ transaction }: { transaction: TransactionCompletion }) => (
  <div className="completion-tracking">
    <CheckboxItem 
      label="Buyer Payment"
      checked={transaction.buyerPaidAmount >= transaction.totalAmount}
      partial={transaction.buyerPaidAmount > 0}
      amount={`₹${transaction.buyerPaidAmount} / ₹${transaction.totalAmount}`}
    />
    <CheckboxItem 
      label="Farmer Payment" 
      checked={transaction.farmerPaidAmount >= transaction.farmerSettlementAmount}
      partial={transaction.farmerPaidAmount > 0}
      amount={`₹${transaction.farmerPaidAmount} / ₹${transaction.farmerSettlementAmount}`}
    />
    <CheckboxItem 
      label="Commission Confirmed"
      checked={transaction.commissionConfirmed}
      amount={`₹${transaction.commissionAmount}`}
      onClick={() => confirmCommission(transaction.transactionId)}
    />
  </div>
);
```

---

## Implementation Priority

### **Phase 1: Database Enhancement**
1. Add completion tracking fields to TRANSACTION table
2. Create auto-update triggers for payment amounts
3. Add completion status calculation function

### **Phase 2: Business Logic**
1. Implement transaction completion workflows
2. Add validation rules for payment limits
3. Create owner dashboard queries

### **Phase 3: UI Components**
1. Build three-checkbox completion interface
2. Create owner confirmation dialogs
3. Add transaction status dashboards

### **Phase 4: Testing**
1. Test all partial payment scenarios
2. Verify commission calculation accuracy
3. Validate completion status logic

---

## Shop Owner Financial Dashboard

### Monthly/On-Demand Financial Summary

Shop owners need comprehensive visibility into pending transactions to manage cash flow effectively. The system provides detailed breakdowns of money owed to farmers and money due from buyers.

#### **Dashboard Query Structure**

```sql
-- Money to Give (Pending Farmer Payments)
SELECT 
    t.id as transaction_id,
    f.name as farmer_name,
    p.name as product_name,
    (SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) as sale_total,
    t.commission_amount,
    ((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.commission_amount) as farmer_settlement_due,
    t.farmer_paid_amount as already_paid,
    (((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.commission_amount) - t.farmer_paid_amount) as still_owe_farmer,
    t.completion_status
FROM TRANSACTION t
JOIN TRANSACTION_ITEM ti ON t.id = ti.transaction_id
JOIN FARMER_STOCK fs ON ti.farmer_stock_id = fs.id  
JOIN USER f ON fs.farmer_user_id = f.id
JOIN PRODUCT p ON ti.product_id = p.id
WHERE t.farmer_paid_amount < ((SELECT SUM(ti2.quantity * ti2.price) FROM TRANSACTION_ITEM ti2 WHERE ti2.transaction_id = t.id) - t.commission_amount)
ORDER BY still_owe_farmer DESC;

-- Money to Get (Pending Buyer Payments)
SELECT 
    t.id as transaction_id,
    b.name as buyer_name,
    (SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) as purchase_total,
    t.buyer_paid_amount as already_received,
    ((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.buyer_paid_amount) as still_need_to_collect,
    t.completion_status
FROM TRANSACTION t
JOIN USER b ON t.buyer_user_id = b.id
WHERE t.buyer_paid_amount < (SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id)
ORDER BY still_need_to_collect DESC;

-- Commission Status Summary
SELECT 
    COUNT(*) as total_transactions,
    SUM(t.commission_amount) as total_commission_earned,
    SUM(CASE WHEN t.commission_confirmed = TRUE THEN t.commission_amount ELSE 0 END) as confirmed_commission,
    SUM(CASE WHEN t.commission_confirmed = FALSE THEN t.commission_amount ELSE 0 END) as pending_confirmation_commission,
    SUM(CASE WHEN t.completion_status = 'complete' THEN t.commission_amount ELSE 0 END) as available_commission
FROM TRANSACTION t
WHERE t.date >= DATE_TRUNC('month', CURRENT_DATE);
```

#### **Practical Example: Green Valley Market - August 2025**

**💸 MONEY TO GIVE (₹45,750 total to farmers):**

| Transaction | Farmer | Product | Sale Total | Commission | Settlement Due | Paid | **Still Owe** |
|-------------|--------|---------|------------|------------|----------------|------|---------------|
| #1001 | Raj | Tomatoes | ₹12,000 | ₹960 | ₹11,040 | ₹5,000 | **₹6,040** |
| #1003 | Sunita | Roses | ₹25,000 | ₹2,500 | ₹22,500 | ₹0 | **₹22,500** |
| #1007 | Mohan | Marigolds | ₹18,000 | ₹2,160 | ₹15,840 | ₹15,000 | **₹840** |
| #1009 | Priya | Jasmine | ₹35,000 | ₹5,250 | ₹29,750 | ₹13,380 | **₹16,370** |

**💰 MONEY TO GET (₹67,200 total from buyers):**

| Transaction | Buyer | Purchase Total | Received | **Still Need** |
|-------------|-------|----------------|----------|----------------|
| #1001 | Wholesale Mart | ₹12,000 | ₹8,000 | **₹4,000** |
| #1002 | Flower Depot | ₹15,000 | ₹0 | **₹15,000** |
| #1004 | Event Planners | ₹22,000 | ₹10,000 | **₹12,000** |
| #1005 | Hotel Chain | ₹28,000 | ₹8,000 | **₹20,000** |
| #1008 | Local Retailer | ₹18,000 | ₹1,800 | **₹16,200** |

**🏪 COMMISSION & CASH FLOW SUMMARY:**

```
Commission Status:
├─ Total Earned: ₹10,870
├─ ✅ Confirmed: ₹6,200 (ready to use)
├─ 🟡 Pending Confirmation: ₹4,670 (needs owner checkbox)
└─ Available for Operations: ₹6,200

Cash Flow Analysis:
├─ 💰 Money Coming In: ₹67,200 (from buyers)
├─ 💸 Money Going Out: ₹45,750 (to farmers)  
├─ 🎯 Net Operating Position: +₹21,450
├─ 💵 Available Commission: ₹6,200
└─ 📈 Total Shop Profit: ₹27,650
```

#### **Action Items Dashboard**

The system generates specific action items for shop owners:

```sql
-- Urgent Actions Required
SELECT 
    'COLLECT_FROM_BUYER' as action_type,
    t.id as transaction_id,
    b.name as party_name,
    ((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.buyer_paid_amount) as amount,
    CASE 
        WHEN t.date < CURRENT_DATE - INTERVAL '30 days' THEN 'OVERDUE'
        WHEN t.date < CURRENT_DATE - INTERVAL '15 days' THEN 'DUE_SOON'
        ELSE 'NORMAL'
    END as urgency
FROM TRANSACTION t
JOIN USER b ON t.buyer_user_id = b.id
WHERE t.buyer_paid_amount < (SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id)

UNION ALL

SELECT 
    'PAY_FARMER' as action_type,
    t.id as transaction_id,
    f.name as party_name,
    (((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.commission_amount) - t.farmer_paid_amount) as amount,
    CASE 
        WHEN t.date < CURRENT_DATE - INTERVAL '7 days' THEN 'URGENT'
        WHEN t.date < CURRENT_DATE - INTERVAL '3 days' THEN 'DUE_SOON'  
        ELSE 'NORMAL'
    END as urgency
FROM TRANSACTION t
JOIN TRANSACTION_ITEM ti ON t.id = ti.transaction_id
JOIN FARMER_STOCK fs ON ti.farmer_stock_id = fs.id
JOIN USER f ON fs.farmer_user_id = f.id
WHERE t.farmer_paid_amount < ((SELECT SUM(ti2.quantity * ti2.price) FROM TRANSACTION_ITEM ti2 WHERE ti2.transaction_id = t.id) - t.commission_amount)

UNION ALL

SELECT 
    'CONFIRM_COMMISSION' as action_type,
    t.id as transaction_id,
    'Commission Confirmation' as party_name,
    t.commission_amount as amount,
    'NORMAL' as urgency
FROM TRANSACTION t
WHERE t.commission_confirmed = FALSE 
  AND t.buyer_paid_amount > 0

ORDER BY 
    CASE urgency 
        WHEN 'OVERDUE' THEN 1
        WHEN 'URGENT' THEN 2  
        WHEN 'DUE_SOON' THEN 3
        ELSE 4
    END,
    amount DESC;
```

#### **Monthly Financial Health Report**

```sql
-- Complete Monthly Summary
SELECT 
    DATE_TRUNC('month', t.date) as month,
    COUNT(*) as total_transactions,
    
    -- Revenue Analysis
    SUM(SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) as total_sales,
    SUM(t.commission_amount) as total_commission_earned,
    SUM(CASE WHEN t.commission_confirmed = TRUE THEN t.commission_amount ELSE 0 END) as commission_realized,
    
    -- Payment Status
    SUM(t.buyer_paid_amount) as total_collected_from_buyers,
    SUM(t.farmer_paid_amount) as total_paid_to_farmers,
    
    -- Outstanding Amounts
    SUM((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.buyer_paid_amount) as outstanding_from_buyers,
    SUM(((SELECT SUM(ti.quantity * ti.price) FROM TRANSACTION_ITEM ti WHERE ti.transaction_id = t.id) - t.commission_amount) - t.farmer_paid_amount) as outstanding_to_farmers,
    
    -- Transaction Completion
    COUNT(CASE WHEN t.completion_status = 'complete' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN t.completion_status = 'partial' THEN 1 END) as partial_transactions,
    COUNT(CASE WHEN t.completion_status = 'pending' THEN 1 END) as pending_transactions
    
FROM TRANSACTION t
WHERE t.date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', t.date)
ORDER BY month DESC;
```

#### **Owner Dashboard UI Components**

The financial dashboard should include:

1. **📊 Summary Cards**
   - Total Money to Collect (from buyers)
   - Total Money to Pay (to farmers)  
   - Net Cash Position
   - Available Commission

2. **📋 Action Required Lists**
   - Overdue buyer payments (red)
   - Urgent farmer payments (orange)
   - Commission confirmations pending (blue)

3. **📈 Trend Analysis**
   - Monthly completion rates
   - Average payment cycles
   - Commission realization trends

4. **🔍 Drill-Down Capability**
   - Click any amount to see transaction details
   - Filter by farmer, buyer, or date range
   - Export financial reports

This comprehensive financial visibility ensures shop owners maintain healthy cash flow and never miss pending obligations to farmers or collections from buyers.

---

## Conclusion

**✅ YES - This transaction completion model is FULLY COMPATIBLE with the current ERD!**

The ERD already has all necessary tables and relationships. We only need to add tracking fields and implement the three-checkbox completion logic. This provides:

1. **Complete transaction lifecycle management**
2. **Independent tracking of all three payment flows**
3. **Flexible partial payment support**
4. **Owner confirmation workflow for commission collection**
5. **Comprehensive audit trail and status tracking**
6. **Real-time financial dashboards for cash flow management**
7. **Monthly/on-demand financial health reporting**

This model ensures no transaction is considered "complete" until all parties have been properly handled, providing robust financial control and transparency.
