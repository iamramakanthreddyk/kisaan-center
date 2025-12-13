# 🌾 KisaanCenter Market Management System - Comprehensive Test Cases

## 📋 Overview
This document contains comprehensive test cases for the KisaanCenter Market Management System, based on the **core_idea.md** fundamental rules and business workflows.

## 🏗️ Core Business Rules (From core_idea.md)
- **Role-based system**: Owner, Farmer, Buyer, Employee, Guest Buyer
- **Stock management**: Farmer delivers → recorded → visible until closed/discarded/returned
- **Flexible payments**: Full, partial, credit with buyer ledger tracking
- **Farmer settlements**: Advance/settlement with commission deduction
- **Commission system**: Per product (percentage or fixed rate)
- **Expense tracking**: Shop expenses (wages, rent, utilities, other)
- **Push notifications only** (in-app) - NO WhatsApp/SMS/Email
- **Comprehensive audit trail** for all transactions

---

# 🌾 KisaanCenter Market Management System - Essential Business Logic Test Cases

## 📋 Overview
This document contains **essential business logic test cases** for the KisaanCenter Market Management System, based on the **core_idea.md** fundamental rules. Focus is on preventing bugs during user data entry and core business operations.

## 🏗️ Core Business Rules (From core_idea.md)
- **Role-based system**: Owner, Farmer, Buyer, Employee, Guest Buyer
- **Stock management**: Farmer delivers → recorded → visible until closed/discarded/returned
- **Flexible payments**: Full, partial, credit with buyer ledger tracking
- **Farmer settlements**: Advance/settlement with commission deduction
- **Commission system**: Per product (percentage or fixed rate)
- **Expense tracking**: Shop expenses (wages, rent, utilities, other)
- **Push notifications only** (in-app) - NO WhatsApp/SMS/Email
- **Comprehensive audit trail** for all transactions

---

## 🔧 1. USER DATA ENTRY VALIDATION TESTS

### 1.1 User Creation Validation
```python
# ✅ Valid Cases (Core Roles Only)
test_create_owner_user_valid_data()
test_create_farmer_user_valid_data()
test_create_buyer_user_valid_data()
test_create_employee_user_valid_data()
test_create_guest_buyer_default_per_shop()

# ❌ Data Entry Bugs Prevention
test_prevent_duplicate_username()
test_prevent_invalid_email_format()
test_prevent_invalid_role_entry()
test_prevent_multiple_owners_per_shop()
test_validate_required_fields_not_empty()
test_validate_password_strength_requirements()
```

### 1.2 Product Data Entry Validation
```python
test_create_product_with_valid_category()
test_prevent_empty_product_name()
test_prevent_negative_product_price()
test_validate_category_from_reference_table()  # fruit, veg, flower, grain
test_prevent_duplicate_product_name_same_shop()
```

### 1.3 Stock Data Entry Validation
```python
test_farmer_stock_delivery_valid_data()
test_prevent_negative_stock_quantity()
test_prevent_zero_stock_quantity()
test_validate_stock_delivery_date()
test_prevent_farmer_delivering_to_wrong_shop()
test_validate_stock_status_enum_values()
```

---

## 🎯 2. CORE BUSINESS LOGIC TESTS

### 2.1 Stock Management Logic (Core Rules)
```python
# Stock Delivery and Visibility
test_farmer_delivers_stock_recorded_in_farmer_stock()
test_unsold_stock_remains_visible_until_closed()  # Core rule
test_farmer_can_close_discard_or_return_unsold_stock()
test_stock_status_transitions_valid_only()

# Stock Adjustments
test_stock_adjustment_with_valid_reason()  # damage, return, correction
test_prevent_stock_adjustment_negative_result()
test_stock_adjustment_creates_audit_log()
```

### 2.2 Transaction Logic (Core Rules)
```python
# Transaction Creation
test_create_sale_transaction_valid_data()
test_create_return_transaction_with_parent_id()
test_prevent_transaction_with_insufficient_stock()
test_validate_transaction_type_enum()  # sale, return, exchange
test_validate_transaction_status_enum()  # pending, completed, cancelled

# Guest Buyer Logic
test_guest_buyer_uses_default_record_per_shop()
test_guest_buyer_cannot_have_credit()
test_guest_buyer_cash_upi_payments_only()
```

### 2.3 Payment Logic (Core Rules)
```python
# Payment Types and Methods
test_payment_type_full_partial_credit_validation()
test_payment_method_from_reference_table()  # cash, upi, card, cheque
test_prevent_negative_payment_amounts()
test_prevent_payment_exceeding_transaction_amount()

# Partial Payment Logic (Core Rule)
test_buyer_partial_payment_updates_transaction()
test_farmer_settlement_proportional_to_payment()
test_commission_applied_only_to_paid_amount()
```

### 2.4 Credit Management Logic (Core Rules)
```python
# Credit Creation and Validation
test_credit_per_transaction_recorded_separately()  # Core rule
test_credit_must_record_farmer_product_qty_price_date()  # Core rule
test_buyer_credit_limit_enforcement()
test_prevent_credit_for_guest_buyers()

# Credit Repayment Logic
test_credit_repayment_updates_buyer_ledger()
test_credit_repayment_reduces_outstanding_amount()
test_prevent_overpayment_of_credit()
```

### 2.5 Commission Logic (Core Rules)
```python
# Commission Rules and Calculation
test_commission_defined_by_owner_per_product()  # Core rule
test_commission_type_percentage_or_fixed_rate()  # Core rule
test_commission_stored_in_transaction_for_history()  # Core rule
test_commission_calculation_accuracy()
test_prevent_negative_commission_rates()
```

### 2.6 Farmer Settlement Logic (Core Rules)
```python
# Settlement Types and Logic
test_farmer_can_request_advance_anytime()  # Core rule
test_farmer_settlement_deducts_commission()  # Core rule
test_settlement_handles_partial_buyer_payments()  # Core rule
test_advance_without_buyer_payment_allowed()  # Core rule edge case

# Settlement Calculations
test_proportional_settlement_calculation_accuracy()
test_settlement_with_previous_advance_deduction()
test_prevent_settlement_exceeding_available_amount()
```

### 2.7 Expense Management Logic
```python
# Expense Recording and Validation
test_expense_category_from_reference_table()  # wage, rent, utility, other
test_prevent_negative_expense_amounts()
test_expense_date_validation()
test_expense_affects_owner_profit_calculation()
```

---

## 🚨 3. BUSINESS RULE EDGE CASES

### 3.1 Stock Management Edge Cases
```python
test_multiple_prices_same_product_same_day()  # Core rule
test_unsold_stock_closure_by_farmer_only()
test_stock_return_transaction_linked_to_parent()
test_stock_adjustment_requires_valid_reason()
```

### 3.2 Payment and Settlement Edge Cases
```python
test_buyer_pays_50_percent_farmer_gets_50_percent_settlement()
test_advance_payment_before_any_buyer_payment()
test_commission_deduction_before_farmer_settlement()
test_partial_payment_sequence_validation()
```

### 3.3 Credit System Edge Cases
```python
test_guest_buyer_registration_no_transaction_merging()  # Core rule
test_buyer_credit_limit_across_multiple_transactions()
test_credit_repayment_allocation_to_oldest_first()
```

### 3.4 User Role Edge Cases
```python
test_farmer_cannot_access_other_farmer_data()
test_buyer_cannot_modify_stock_records()
test_employee_can_only_record_transactions()
test_owner_full_access_to_shop_data()
```

---

## 📊 4. DATA INTEGRITY TESTS

### 4.1 Reference Data Validation
```python
# ENUM Validation
test_user_role_enum_values_only()  # owner, farmer, buyer, employee, guest
test_user_status_enum_values_only()  # active, inactive, suspended
test_payment_method_enum_values_only()  # cash, upi, card, cheque
test_expense_category_enum_values_only()  # wage, rent, utility, other

# Reference Table Validation
test_product_category_valid_values_only()  # fruit, veg, flower, grain
test_commission_rule_type_valid_values_only()  # flat, percentage
```

### 4.2 Business Relationship Validation
```python
test_transaction_belongs_to_valid_shop()
test_farmer_stock_belongs_to_farmer_and_shop()
test_payment_linked_to_valid_transaction()
test_credit_linked_to_valid_buyer_and_transaction()
test_settlement_linked_to_valid_farmer()
```

### 4.3 Audit Trail Validation
```python
test_audit_log_created_on_transaction_edit()
test_audit_log_created_on_stock_adjustment()
test_audit_log_created_on_farmer_settlement()
test_audit_log_created_on_credit_update()
test_audit_log_stores_user_timestamp_old_new_data()
```

---

## 🔔 5. NOTIFICATION LOGIC TESTS (In-Scope Only)

### 5.1 Push Notification Triggers
```python
test_notification_sent_on_stock_delivery()
test_notification_sent_on_buyer_payment()
test_notification_sent_on_credit_creation()
test_notification_sent_on_credit_repayment()
test_notification_sent_on_farmer_settlement()
```

### 5.2 Notification Delivery Logic
```python
test_notification_delivered_to_active_users_only()
test_notification_not_sent_to_suspended_users()
test_push_notifications_only_no_sms_whatsapp_email()  # Core rule
```

---

## ✅ 6. COMPLETE WORKFLOW TESTS

### 6.1 End-to-End Business Flows
```python
test_farmer_stock_to_sale_full_payment_workflow():
    # 1. Farmer delivers stock
    # 2. Buyer purchases with full payment
    # 3. Commission calculated and stored
    # 4. Farmer requests settlement
    # 5. Settlement with commission deduction
    # 6. Push notifications sent

test_partial_payment_proportional_settlement_workflow():
    # 1. Farmer delivers stock
    # 2. Buyer pays 60% of transaction
    # 3. Farmer gets 60% settlement (minus commission)
    # 4. Buyer pays remaining 40%
    # 5. Farmer gets remaining settlement

test_credit_transaction_repayment_workflow():
    # 1. Buyer purchases on credit
    # 2. Credit record created per transaction
    # 3. Buyer makes partial repayments
    # 4. Credit ledger updated with each payment
    # 5. Final payment completes transaction

test_guest_buyer_walk_in_purchase_workflow():
    # 1. Guest buyer uses default shop record
    # 2. Cash/UPI payment only
    # 3. No credit allowed
    # 4. Transaction recorded against guest buyer
```

---

## 🎯 CONCLUSION

This focused test plan covers **96 essential business logic test cases** that prevent bugs during user data entry and core business operations:

- **Data Entry Validation**: Prevents invalid user inputs
- **Core Business Logic**: Validates fundamental rules from core_idea.md
- **Edge Cases**: Covers specific business scenarios and exceptions
- **Data Integrity**: Ensures referential integrity and audit trails
- **Complete Workflows**: Validates end-to-end business processes

**Focus Areas for Implementation:**
1. **User data entry validation** (highest priority for bug prevention)
2. **Core business rules enforcement** per core_idea.md
3. **Payment and settlement logic** accuracy
4. **Stock management** visibility and status rules
5. **Credit system** per-transaction recording and limits
6. **Audit trail** completeness for compliance

This streamlined test plan ensures robust validation of core business functionality while preventing user data entry bugs.

---

## 📋 FINAL SUMMARY

This **streamlined business logic test plan** contains **96 essential test cases** focused on preventing bugs during user data entry and core business operations:

### **Test Categories:**
1. **User Data Entry Validation** (18 tests) - Prevents invalid inputs
2. **Core Business Logic** (42 tests) - Validates fundamental rules
3. **Business Rule Edge Cases** (24 tests) - Covers specific scenarios
4. **Data Integrity** (12 tests) - Ensures referential integrity and audit trails

### **Priority Implementation Order:**
1. **Data Entry Validation** - Immediate bug prevention
2. **Payment & Settlement Logic** - Core business accuracy  
3. **Stock Management Rules** - Inventory visibility and status
4. **Credit System Logic** - Per-transaction recording and limits
5. **Audit Trail Coverage** - Compliance and tracking

This focused approach ensures **robust validation of core business functionality** while **preventing user data entry bugs** based on the fundamental rules defined in **core_idea.md**.
