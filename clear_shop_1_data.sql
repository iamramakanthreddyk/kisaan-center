-- SQL Script to Clear All Transaction and Payment Data for Shop ID 1
-- This script deletes all transaction-related data for shop_id = 1
-- Execute in proper order to handle foreign key constraints

-- WARNING: This will permanently delete all transaction and payment data for shop 1
-- Make sure to backup your database before running this script

-- Begin transaction for atomicity
BEGIN;

-- 1. Delete audit logs for shop 1 and related users (if any)
DELETE FROM kisaan_audit_logs
WHERE shop_id = 1
   OR user_id IN (
       SELECT id FROM kisaan_users WHERE shop_id = 1
   );

-- 2. Delete expense settlements (links expenses to payments)
DELETE FROM expense_settlements
WHERE expense_id IN (
    SELECT id FROM kisaan_expenses WHERE shop_id = 1
)
OR payment_id IN (
    SELECT id FROM kisaan_payments WHERE shop_id = 1
);

-- 3. Delete payment allocations (junction between payments and transactions)
DELETE FROM kisaan_payment_allocations
WHERE payment_id IN (
    SELECT id FROM kisaan_payments WHERE shop_id = 1
)
OR transaction_id IN (
    SELECT id FROM kisaan_transactions WHERE shop_id = 1
);

-- 4. Delete transaction ledger entries
DELETE FROM kisaan_transaction_ledger
WHERE transaction_id IN (
    SELECT id FROM kisaan_transactions WHERE shop_id = 1
)
OR user_id IN (
    SELECT id FROM kisaan_users WHERE shop_id = 1
);

-- 5. Delete balance snapshots for users in shop 1
DELETE FROM kisaan_balance_snapshots
WHERE user_id IN (
    SELECT id FROM kisaan_users WHERE shop_id = 1
);

-- 6. Delete transaction idempotency records
DELETE FROM kisaan_transaction_idempotency
WHERE transaction_id IN (
    SELECT id FROM kisaan_transactions WHERE shop_id = 1
)
OR shop_id = 1
OR buyer_id IN (
    SELECT id FROM kisaan_users WHERE shop_id = 1
)
OR farmer_id IN (
    SELECT id FROM kisaan_users WHERE shop_id = 1
);

-- 7. Delete settlements
DELETE FROM kisaan_settlements
WHERE shop_id = 1
   OR user_id IN (
       SELECT id FROM kisaan_users WHERE shop_id = 1
   )
   OR transaction_id IN (
       SELECT id FROM kisaan_transactions WHERE shop_id = 1
   );

-- 8. Delete expenses for shop 1
DELETE FROM kisaan_expenses
WHERE shop_id = 1
   OR user_id IN (
       SELECT id FROM kisaan_users WHERE shop_id = 1
   );

-- 9. Delete payments for shop 1
DELETE FROM kisaan_payments
WHERE shop_id = 1
   OR transaction_id IN (
       SELECT id FROM kisaan_transactions WHERE shop_id = 1
   );

-- 10. Finally, delete transactions for shop 1
DELETE FROM kisaan_transactions
WHERE shop_id = 1;

-- Reset user balances to 0 for users in shop 1 (since all transactions are cleared)
UPDATE kisaan_users
SET balance = 0, cumulative_value = 0
WHERE shop_id = 1;

-- Commit the transaction
COMMIT;

-- Verification query: Check if any data remains for shop 1
SELECT
    (SELECT COUNT(*) FROM kisaan_transactions WHERE shop_id = 1) as transactions_remaining,
    (SELECT COUNT(*) FROM kisaan_payments WHERE shop_id = 1) as payments_remaining,
    (SELECT COUNT(*) FROM kisaan_expenses WHERE shop_id = 1) as expenses_remaining,
    (SELECT COUNT(*) FROM kisaan_settlements WHERE shop_id = 1) as settlements_remaining;