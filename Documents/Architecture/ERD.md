
# Market Management System - Entity Relationship Diagram

## 🎯 **ERD Overview**
This document contains the core Entity Relationship Diagram for the Market Management System, showing the relationships between all entities and their key attributes.

**📋 Related Documentation:**


## Entity Relationship Diagram

```mermaid
erDiagram
    %% Core User Management
    SUPERADMIN ||--o{ USER : creates
    SUPERADMIN ||--o{ SHOP : creates
    SUPERADMIN ||--o{ PLAN : assigns

    %% Shop & User Relationships
    USER ||--o{ SHOP : manages
    USER ||--o{ TRANSACTION : initiates
    USER ||--o{ CREDIT : owes
    USER ||--o{ FARMER_PAYMENT : receives
    USER ||--o{ FARMER_STOCK : delivers

    %% Shop Operations
    SHOP ||--o{ PRODUCT : offers
    SHOP ||--o{ TRANSACTION : records
    SHOP ||--o{ EXPENSE : incurs
    SHOP ||--o{ FARMER_STOCK : receives
    SHOP ||--o{ AUDIT_LOG : logs
    SHOP ||--o{ COMMISSION_RULE : configures
    SHOP ||--o{ STOCK_ADJUSTMENT : adjusts

    %% Product Management
    PRODUCT ||--o{ CATEGORY : categorized_as
    PRODUCT ||--o{ PRODUCT_PRICE_HISTORY : has
    PRODUCT ||--o{ TRANSACTION_ITEM : referenced_in
    COMMISSION_RULE ||--o{ PRODUCT : applies_to

    %% Stock Management
    FARMER_STOCK ||--o{ PRODUCT : for
    FARMER_STOCK ||--o{ TRANSACTION_ITEM : source
    FARMER_STOCK ||--o{ STOCK_ADJUSTMENT : adjusted_by

    %% Transaction Flow
    TRANSACTION ||--o{ TRANSACTION_ITEM : has
    TRANSACTION ||--o{ PAYMENT : has
    TRANSACTION ||--o{ CREDIT : creates
    TRANSACTION ||--o{ FARMER_PAYMENT : settled_by
    TRANSACTION ||--o{ AUDIT_LOG : logs
    TRANSACTION ||--o{ TRANSACTION : parent

    %% Credit Management
    CREDIT ||--o{ CREDIT_DETAIL : details
    CREDIT ||--o{ PAYMENT : repaid_by

    %% Audit & Logging
    PAYMENT ||--o{ AUDIT_LOG : logs
    FARMER_PAYMENT ||--o{ AUDIT_LOG : logs
    CREDIT ||--o{ AUDIT_LOG : logs
    CREDIT_DETAIL ||--o{ AUDIT_LOG : logs

    %% Reference Data
    EXPENSE_CATEGORY ||--o{ EXPENSE : categorizes
    PLAN ||--o{ PLAN_FEATURE : has
    PAYMENT_METHOD ||--o{ PAYMENT : method
    PAYMENT_METHOD ||--o{ FARMER_PAYMENT : method

    %% Entity Definitions
    USER {
        int id PK
        string username UK
        string password_hash
        enum role
        int shop_id FK
        int created_by FK
        string contact
        decimal credit_limit
        datetime created_at
        datetime updated_at
        enum status
    }

    SHOP {
        int id PK
        string name UK
        string location
        int plan_id FK
        int created_by FK
        datetime created_at
        datetime updated_at
        enum status
    }

    PRODUCT {
        int id PK
        int shop_id FK
        string name
        int category_id FK
        datetime created_at
        datetime updated_at
        enum status
    }

    FARMER_STOCK {
        int id PK
        int shop_id FK
        int farmer_user_id FK
        int product_id FK
        decimal quantity
        enum status
        datetime date
        datetime created_at
        datetime updated_at
    }

    TRANSACTION {
        int id PK
        int shop_id FK
        int buyer_user_id FK
        int parent_transaction_id FK
        enum type
        enum status
        decimal commission_rate
        decimal commission_amount
        enum payment_status
        decimal buyer_paid_amount
        decimal farmer_paid_amount
        boolean commission_confirmed
        enum completion_status
        datetime date
        datetime created_at
        datetime updated_at
    }

    TRANSACTION_ITEM {
        int id PK
        int transaction_id FK
        int product_id FK
        int farmer_stock_id FK
        decimal quantity
        decimal price
        enum status
        datetime created_at
        datetime updated_at
    }

    CREDIT {
        int id PK
        int transaction_id FK
        int buyer_user_id FK
        decimal amount
        enum status
        datetime created_at
        datetime updated_at
    }

    CREDIT_DETAIL {
        int id PK
        int credit_id FK
        int farmer_user_id FK
        int product_id FK
        decimal quantity
        decimal price
        datetime date
        datetime created_at
        datetime updated_at
    }

    PAYMENT {
        int id PK
        int transaction_id FK
        int credit_id FK
        decimal amount
        int payment_method_id FK
        enum type
        enum status
        datetime date
        datetime created_at
        datetime updated_at
    }

    FARMER_PAYMENT {
        int id PK
        int transaction_id FK
        int farmer_stock_id FK
        int farmer_user_id FK
        decimal amount
        enum payment_type
        int payment_method_id FK
        string remarks
        datetime date
        datetime created_at
        datetime updated_at
    }

    COMMISSION_RULE {
        int id PK
        int shop_id FK
        int product_id FK
        enum rule_type
        decimal rate
        decimal min_qty
        decimal max_qty
        datetime created_at
        datetime updated_at
    }

    AUDIT_LOG {
        int id PK
        int shop_id FK
        string entity_type
        int entity_id
        int user_id FK
        json old_data
        json new_data
        datetime created_at
    }
```


## System Workflow Overview

### Complete Business Process Flow with Transaction Completion Tracking
```mermaid
flowchart TD
    %% Farmer Operations
    F1[Farmer delivers products] --> F2[Stock recorded in FARMER_STOCK]
    F2 --> F3[Products available for sale]
    F3 --> F4[Farmer views stock status]
    F4 --> F5[Farmer requests payment]
    F5 --> F6[FARMER_PAYMENT recorded]

    %% Buyer Operations  
    B1[Buyer views available products] --> B2[Buyer selects items]
    B2 --> B3[TRANSACTION created]
    B3 --> B4[TRANSACTION_ITEM details]
    B4 --> B5{Payment Type?}
    
    B5 -->|Full Payment| B6[PAYMENT recorded]
    B5 -->|Partial Payment| B6A[Partial PAYMENT recorded]
    B5 -->|Credit| B7[CREDIT & CREDIT_DETAIL created]
    
    %% Transaction Completion Workflow
    B6 --> TC1[Update buyer_paid_amount]
    B6A --> TC1
    B7 --> TC2[Buyer payment pending]
    
    TC1 --> TC3{All buyer payment received?}
    TC2 --> TC3
    TC3 -->|Yes| TC4[✅ Buyer Payment Complete]
    TC3 -->|No| TC5[🟡 Buyer Payment Partial]
    
    %% Farmer Payment Flow
    F6 --> TC6[Update farmer_paid_amount]
    TC6 --> TC7{All farmer payment made?}
    TC7 -->|Yes| TC8[✅ Farmer Payment Complete]
    TC7 -->|No| TC9[🟡 Farmer Payment Partial]
    
    %% Commission Confirmation
    TC4 --> TC10{Owner confirms commission?}
    TC5 --> TC10
    TC8 --> TC10
    TC9 --> TC10
    TC10 -->|Yes| TC11[✅ Commission Confirmed]
    TC10 -->|No| TC12[❌ Commission Pending]
    
    %% Final Transaction Status
    TC11 --> TC13{All three checkboxes?}
    TC12 --> TC13
    TC13 -->|✅✅✅| TC14[TRANSACTION completion_status = 'complete']
    TC13 -->|Partial| TC15[TRANSACTION completion_status = 'partial']
    TC13 -->|None| TC16[TRANSACTION completion_status = 'pending']
    
    %% Credit Management
    B7 --> B9[Credit ledger updated]
    B9 --> B10[Buyer makes partial payment]
    B10 --> B11[PAYMENT with credit_id]
    B11 --> B12[CREDIT status updated]
    B11 --> TC1

    %% Owner Operations
    O1[Owner reviews all operations] --> O2[Commission calculated]
    O2 --> O3[Transaction completion dashboard]
    O3 --> O4[Owner confirms commissions]
    O4 --> TC10
    
    %% Audit Trail
    F2 -.-> A1[AUDIT_LOG entry]
    B3 -.-> A1
    B6 -.-> A1
    F6 -.-> A1
    TC11 -.-> A1
    TC14 -.-> A1
    
    %% Stock Adjustments
    F3 --> S1{Stock Issues?}
    S1 -->|Yes| S2[STOCK_ADJUSTMENT]
    S2 -.-> A1
```


## Core Entity Relationships Explained

### 1. **User Management Hierarchy**

### 2. **Stock Management Flow**

### 3. **Transaction & Payment Architecture with Completion Tracking**
  - `buyer_paid_amount`: Tracks total payments received from buyer
  - `farmer_paid_amount`: Tracks total payments made to farmers
  - `commission_confirmed`: Boolean flag for owner commission confirmation
  - `completion_status`: Overall transaction status ('pending', 'partial', 'complete')
  - ✅ Buyer payment complete (buyer_paid_amount >= transaction total)
  - ✅ Farmer payment complete (farmer_paid_amount >= settlement amount)
  - ✅ Commission confirmed by owner (commission_confirmed = TRUE)

### 4. **Credit Management System**

### 5. **Audit & Compliance**


## Key Business Rules Reflected in ERD

### 1. **Multi-Tenant Design**

### 2. **Flexible Payment Models with Completion Tracking**

### 3. **Stock Lifecycle Management**

### 4. **Credit Management**

### 5. **Transaction Completion Control**


## Transaction Completion Workflow

### Three-Checkbox Completion Model

Every transaction requires three independent confirmations:

1. **✅ Buyer Payment Checkbox**
   - Tracks: `buyer_paid_amount` vs transaction total
   - Status: Complete when `buyer_paid_amount >= SUM(transaction_items.quantity * price)`

2. **✅ Farmer Payment Checkbox**  
   - Tracks: `farmer_paid_amount` vs settlement amount
   - Status: Complete when `farmer_paid_amount >= (transaction_total - commission_amount)`

3. **✅ Commission Confirmation Checkbox**
   - Tracks: `commission_confirmed` boolean flag
   - Status: Complete when owner manually confirms commission received

### Completion Status Logic

```sql
completion_status = CASE
    WHEN buyer_payment_complete AND farmer_payment_complete AND commission_confirmed 
    THEN 'complete'
    WHEN buyer_paid_amount > 0 OR farmer_paid_amount > 0 OR commission_confirmed 
    THEN 'partial'
    ELSE 'pending'
END
```

### Example Scenarios

**Complete Transaction (₹1,000 sale, 10% commission):**
```
✅ Buyer paid: ₹1,000 / ₹1,000 (100%)
✅ Farmer paid: ₹900 / ₹900 (100%) 
✅ Commission confirmed: ₹100
Status: COMPLETE
```

**Partial Transaction:**
```
🟡 Buyer paid: ₹600 / ₹1,000 (60%)
🟡 Farmer paid: ₹540 / ₹900 (60%) 
✅ Commission confirmed: ₹60 (60% of ₹100)
Status: PARTIAL
```

**Financial Dashboard Coverage:** For detailed financial reporting and owner dashboard requirements, see [Transaction Completion Workflows](./Transaction_Completion_Workflows.md).


## 📋 **ERD Implementation Notes**

### Database Constraints
  - `buyer_paid_amount >= 0` and `<= transaction_total`
  - `farmer_paid_amount >= 0` and `<= settlement_amount`
  - `commission_confirmed` can only be TRUE if `buyer_paid_amount > 0`
  - `completion_status` auto-calculated based on three checkboxes

### Performance Considerations

### Scalability Features

This ERD serves as the foundational blueprint for the Market Management System, ensuring all business relationships are properly modeled and data integrity is maintained across all operations. 

**Enhanced with Transaction Completion Workflow:**

**Key Enhancement Summary:**

This enhanced ERD supports robust financial management with complete transparency and control over the transaction lifecycle.
```


