

# Market Management System - ENUMs & Reference Data

## 📋 **Complete ENUM Values & Reference Standards**

This document contains all standardized ENUM values and reference data used throughout the system, ensuring consistency across database, API, and frontend implementations.

---

## Core Entity ENUMs

### USER
```sql
-- User roles with system permissions
role: 'superadmin', 'owner', 'employee', 'farmer', 'buyer', 'guest'

-- User account status
status: 'active', 'inactive', 'suspended'
```
**Usage Examples:**
- `superadmin`: System-wide administrative access
- `owner`: Shop-level management and oversight
- `employee`: Limited operational permissions
- `farmer`: Personal delivery and payment tracking
- `buyer`: Purchase and credit management
- `guest`: Temporary walk-in customer access

### SHOP
```sql
-- Shop operational status
status: 'active', 'inactive', 'suspended', 'closed'
```
**Usage Examples:**
- `active`: Normal business operations
- `inactive`: Temporarily not operating
- `suspended`: Administrative suspension
- `closed`: Permanently closed

### PRODUCT
```sql
-- Product availability status
status: 'active', 'inactive', 'discontinued'
```

### CATEGORY (Reference Table)
```sql
-- Product categories for classification
name: 'flower', 'vegetable', 'fruit', 'grain', 'other'
```
**Specific Products by Category:**
- **flowers**: rose, marigold, jasmine, lotus, lily, orchid
- **vegetables**: tomato, onion, potato, carrot, cabbage
- **fruits**: apple, mango, banana, orange, grapes
- **grains**: wheat, rice, corn, barley, oats

---

## Transaction & Financial ENUMs

### FARMER_STOCK
```sql
-- Stock delivery and availability status
status: 'active', 'closed', 'discarded', 'returned'
```
**Status Transitions:**
- `active` → `closed` (sold out)
- `active` → `discarded` (damaged/expired)
- `active` → `returned` (sent back to farmer)

### TRANSACTION
```sql
-- Transaction types
type: 'sale', 'return', 'exchange'

-- Transaction processing status
status: 'pending', 'completed', 'cancelled'

-- Payment status for the transaction
payment_status: 'pending', 'completed', 'failed'
```

### TRANSACTION_ITEM
```sql
-- Individual item status within transaction
status: 'active', 'refunded'
```

### CREDIT
```sql
-- Buyer credit status
status: 'pending', 'partial', 'cleared'
```
**Status Meanings:**
- `pending`: No payments made yet
- `partial`: Some payments received, balance remaining
- `cleared`: Fully paid, no outstanding amount

### PAYMENT
```sql
-- Payment types
type: 'full', 'partial', 'credit'

-- Payment processing status
status: 'pending', 'completed', 'failed', 'refunded'
```

### FARMER_PAYMENT
```sql
-- Farmer payment types
payment_type: 'advance', 'settlement'
```
**Payment Types Explained:**
- `advance`: Payment before/during delivery (no transaction reference)
- `settlement`: Final payment after sales (linked to specific transactions)

---

## Commission & Pricing ENUMs

### COMMISSION_RULE
```sql
-- Commission calculation methods
rule_type: 'flat', 'slab'
```
**Rule Types:**
- `flat`: Fixed percentage on all sales
- `slab`: Variable percentage based on quantity ranges

### PRODUCT_PRICE_HISTORY
```sql
-- Price source for market comparison
source: 'market', 'govt', 'mandi', 'internal'
```

---

## Payment & Method ENUMs

### PAYMENT_METHOD (Reference Table)
```sql
-- Available payment methods
name: 'cash', 'upi', 'card', 'bank_transfer', 'cheque', 'wallet'
```
**Method Details:**
- `cash`: Physical currency transactions
- `upi`: Digital UPI transfers
- `card`: Credit/debit card payments
- `bank_transfer`: Direct bank account transfers
- `cheque`: Traditional cheque payments
- `wallet`: Digital wallet payments

---

## Operational ENUMs

### EXPENSE_CATEGORY (Reference Table)
```sql
-- Expense categorization for reporting
name: 'wage', 'rent', 'utility', 'transport', 'supplies', 'other'
```
**Category Examples:**
- `wage`: Employee salaries and payments
- `rent`: Shop/storage rental costs
- `utility`: Electricity, water, internet
- `transport`: Delivery and logistics costs
- `supplies`: Operating materials and equipment
- `other`: Miscellaneous business expenses

### STOCK_ADJUSTMENT
```sql
-- Reasons for stock adjustments
reason: 'quality_issue', 'damage', 'theft', 'correction', 'expired', 'returned'
```

### AUDIT_LOG
```sql
-- Types of entities being audited
entity_type: 'USER', 'TRANSACTION', 'PAYMENT', 'FARMER_PAYMENT', 'CREDIT', 'CREDIT_DETAIL', 'STOCK_ADJUSTMENT', 'FARMER_STOCK'
```

---

## System Administration ENUMs

### PLAN (Reference Table)
```sql
-- Subscription plan types
name: 'basic', 'premium', 'enterprise', 'custom'
```

### PLAN_FEATURE (Reference Table)
```sql
-- Available features across plans
name: 'multi_shop', 'advanced_reports', 'api_access', 'bulk_operations', 'priority_support'
```

### NOTIFICATION
```sql
-- Notification types
type: 'info', 'warning', 'error', 'success'

-- Notification categories
category: 'transaction', 'payment', 'stock', 'system', 'user'

-- Notification priority levels
priority: 'low', 'normal', 'high', 'urgent'
```

---

## Regional & Localization ENUMs

### CURRENCY
```sql
-- Supported currencies
code: 'INR', 'USD', 'EUR', 'GBP' -- Extensible for international expansion
```

### LANGUAGE
```sql
-- Supported languages
code: 'en', 'hi', 'te', 'ta', 'kn' -- English, Hindi, Telugu, Tamil, Kannada
```

### TIMEZONE
```sql
-- Indian timezone support
name: 'Asia/Kolkata', 'Asia/Mumbai', 'Asia/Chennai' -- Regional variations
```

---

## Validation Rules & Constraints

### ENUM Validation Patterns
```javascript
// Frontend validation patterns
const USER_ROLES = ['superadmin', 'owner', 'employee', 'farmer', 'buyer', 'guest'];
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'wallet'];
const TRANSACTION_TYPES = ['sale', 'return', 'exchange'];

// Backend validation (SQL)
ALTER TABLE USER ADD CONSTRAINT chk_user_role 
CHECK (role IN ('superadmin', 'owner', 'employee', 'farmer', 'buyer', 'guest'));

ALTER TABLE PAYMENT ADD CONSTRAINT chk_payment_status 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
```

### Business Logic Validations
```sql
-- Credit limit validation
ALTER TABLE USER ADD CONSTRAINT chk_credit_limit 
CHECK (credit_limit >= 0);

-- Commission rate validation
ALTER TABLE COMMISSION_RULE ADD CONSTRAINT chk_commission_rate 
CHECK (rate >= 0 AND rate <= 100);

-- Quantity validations
ALTER TABLE FARMER_STOCK ADD CONSTRAINT chk_quantity_positive 
CHECK (quantity > 0);
```

---

## API Response Standards

### Standard Status Responses
```json
{
  "success": true,
  "status": "completed",
  "message": "Operation completed successfully",
  "data": {...}
}
```

### Error Response Standards
```json
{
  "success": false,
  "status": "failed",
  "error": {
    "code": "INVALID_ENUM_VALUE",
    "message": "Invalid status value provided",
    "field": "transaction.status",
    "allowed_values": ["pending", "completed", "cancelled"]
  }
}
```

---

## Frontend Display Standards

### User Role Display Names
```javascript
const ROLE_DISPLAY_NAMES = {
  'superadmin': 'System Administrator',
  'owner': 'Shop Owner',
  'employee': 'Employee',
  'farmer': 'Farmer/Supplier',
  'buyer': 'Customer/Buyer',
  'guest': 'Guest Customer'
};
```

### Status Color Coding
```css
/* Status colors for consistent UI */
.status-active { color: #28a745; }
.status-pending { color: #ffc107; }
.status-failed { color: #dc3545; }
.status-completed { color: #007bff; }
.status-suspended { color: #6c757d; }
```

---

## Migration & Extensibility

### Adding New ENUM Values
```sql
-- Safe ENUM extension pattern
ALTER TABLE tablename MODIFY COLUMN column_name 
ENUM('existing_value1', 'existing_value2', 'new_value');

-- Update application code to handle new values
-- Update validation rules and constraints
-- Update frontend display mappings
```

### Internationalization Support
```javascript
// ENUM translation support
const ENUM_TRANSLATIONS = {
  'en': {
    'active': 'Active',
    'pending': 'Pending',
    'completed': 'Completed'
  },
  'hi': {
    'active': 'सक्रिय',
    'pending': 'लंबित',
    'completed': 'पूर्ण'
  }
};
```

This comprehensive ENUM documentation ensures consistency across all system components while providing clear guidelines for implementation and extension.
- name: 'basic', 'premium', 'enterprise', 'custom'
- status: 'active', 'inactive', 'expired', 'suspended'
- features: (reference table or JSON, e.g., 'advanced_analytics', 'bulk_sms', 'multi_region')

## CATEGORY
- name: (reference table, e.g., 'rose', 'marigold', 'jasmine', 'lily', ...)

## AUDIT_LOG
- entity_type: 'user', 'shop', 'product', 'farmer_stock', 'transaction', 'payment', 'expense', 'plan', 'credit', 'commission_rule', 'product_price_history', 'other'

---

This ENUM reference is cross-checked with the ERD and covers all fields and cases. Use these for database fields, application logic, and API validation to ensure consistency and maintainability across KisaanCenter.
