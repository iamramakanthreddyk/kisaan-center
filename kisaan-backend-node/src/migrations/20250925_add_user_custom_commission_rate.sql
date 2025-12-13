-- Add custom_commission_rate to kisaan_users if missing
ALTER TABLE kisaan_users
  ADD COLUMN IF NOT EXISTS custom_commission_rate DECIMAL(6,2);

-- Optional: clamp invalid existing values (negative or >100) to NULL
UPDATE kisaan_users
SET custom_commission_rate = NULL
WHERE custom_commission_rate IS NOT NULL AND (custom_commission_rate < 0 OR custom_commission_rate > 100);

CREATE INDEX IF NOT EXISTS idx_users_custom_commission_rate ON kisaan_users(custom_commission_rate);
