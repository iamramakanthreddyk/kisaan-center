-- Backfill product_id in payments from transactions
UPDATE kisaan_payments
SET product_id = t.product_id
FROM kisaan_transactions t
WHERE kisaan_payments.transaction_id = t.id
  AND kisaan_payments.product_id IS NULL
  AND t.product_id IS NOT NULL;