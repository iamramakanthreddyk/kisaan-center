-- Validation queries to run post-migration

-- 1. Check monetary precision (should be NUMERIC(18,2))
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name IN ('kisaan_payments', 'kisaan_transactions')
  AND column_name IN ('amount', 'total_amount', 'farmer_earning')
ORDER BY table_name, column_name;

-- 2. Check payment_date is not null
SELECT COUNT(*) as null_payment_dates
FROM kisaan_payments
WHERE payment_date IS NULL;

-- 3. Check product_id backfill success
SELECT COUNT(*) as payments_without_product_id
FROM kisaan_payments p
LEFT JOIN kisaan_transactions t ON p.transaction_id = t.id
WHERE p.product_id IS NULL AND t.product_id IS NOT NULL;

-- 4. Check commission duplicates removed
SELECT shop_id, rate, type, COUNT(*) as count
FROM kisaan_commissions
GROUP BY shop_id, rate, type
HAVING COUNT(*) > 1;

-- 5. Check timestamp types
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('kisaan_payments', 'kisaan_transactions')
  AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;