# LEDGER SYSTEMS ARCHITECTURE

## ⚠️ CRITICAL: Two Independent Ledger Systems

This application contains **TWO SEPARATE AND INDEPENDENT** ledger systems that serve different purposes:

### 1. `kisaan_ledger` - Simple Farmer Ledger (UI Component)
**Purpose:** User-friendly balance tracking for shop owners
**Table:** `kisaan_ledger`
**API:** `/api/simple-ledger/*`
**Characteristics:**
- Simplified data model
- No direct foreign key relationships to transactions/payments
- Uses text references in `notes` field (e.g., "Transaction #123")
- Maintained independently from transaction processing
- Focus: UI display and manual adjustments

### 2. `kisaan_ledger_entries` - Main Accounting Ledger (ERP Component)
**Purpose:** Authoritative financial audit trail and accounting
**Table:** `kisaan_ledger_entries`
**Service:** `LedgerService`
**Characteristics:**
- Proper double-entry accounting
- Foreign key relationships via `reference_type` + `reference_id`
- Automatically updated by `TransactionService`, `PaymentService`, etc.
- Immutable audit trail
- Focus: Financial accuracy and compliance

## 🚫 DO NOT CONFUSE THESE SYSTEMS

### When to Use Each System:

**Use `kisaan_ledger` (Simple Farmer Ledger) for:**
- Shop owner dashboards
- Farmer balance displays
- Manual ledger adjustments
- Simplified reporting

**Use `kisaan_ledger_entries` (Main Ledger) for:**
- Financial reporting
- Audit trails
- Transaction reconciliation
- Accounting compliance
- Balance calculations

### Key Differences:

| Aspect | Simple Farmer Ledger | Main Accounting Ledger |
|--------|---------------------|------------------------|
| **Table** | `kisaan_ledger` | `kisaan_ledger_entries` |
| **Relationships** | Text in `notes` field | FK: `reference_type`, `reference_id` |
| **Updates** | Manual/Manual triggers | Automatic via services |
| **Purpose** | UI Display | Financial Audit |
| **Authority** | Secondary | Primary |

## 🔄 Synchronization

**IMPORTANT:** These systems are NOT automatically synchronized.
- Transaction creation updates `kisaan_ledger_entries` only
- `kisaan_ledger` must be maintained separately
- Manual reconciliation may be required for consistency

## 📝 Development Guidelines

1. **Never** modify transaction logic to automatically update `kisaan_ledger`
2. **Always** use `kisaan_ledger_entries` for financial calculations
3. **Clearly** document which ledger system you're working with
4. **Test** both systems independently when making changes

## 🏗️ Future Considerations

Consider whether these systems should be:
- Merged into a single unified ledger
- Clearly separated with different APIs
- Synchronized automatically
- Deprecated (Simple Farmer Ledger in favor of Main Ledger)</content>
<parameter name="filePath">c:\Users\r.kowdampalli\Documents\MyProjects\kisaan-center\docs\LEDGER_SYSTEMS_ARCHITECTURE.md