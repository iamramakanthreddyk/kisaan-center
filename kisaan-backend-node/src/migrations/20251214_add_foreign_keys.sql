-- Add foreign key constraints for KisaanCenter tables (moved from unified-schema.sql)
-- Safe to re-run; uses IF NOT EXISTS.

-- Users foreign keys
ALTER TABLE kisaan_users ADD CONSTRAINT IF NOT EXISTS kisaan_users_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES kisaan_users(id);

-- Shops foreign keys
ALTER TABLE kisaan_shops ADD CONSTRAINT IF NOT EXISTS kisaan_shops_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES kisaan_users(id);
ALTER TABLE kisaan_shops ADD CONSTRAINT IF NOT EXISTS kisaan_shops_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES kisaan_plans(id);

-- Products foreign keys
ALTER TABLE kisaan_products ADD CONSTRAINT IF NOT EXISTS kisaan_products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES kisaan_categories(id);

-- Transactions foreign keys
ALTER TABLE kisaan_transactions ADD CONSTRAINT IF NOT EXISTS kisaan_transactions_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);
ALTER TABLE kisaan_transactions ADD CONSTRAINT IF NOT EXISTS kisaan_transactions_farmer_id_fkey 
    FOREIGN KEY (farmer_id) REFERENCES kisaan_users(id);
ALTER TABLE kisaan_transactions ADD CONSTRAINT IF NOT EXISTS kisaan_transactions_buyer_id_fkey 
    FOREIGN KEY (buyer_id) REFERENCES kisaan_users(id);
ALTER TABLE kisaan_transactions ADD CONSTRAINT IF NOT EXISTS kisaan_transactions_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES kisaan_categories(id);

-- Payments foreign keys
ALTER TABLE kisaan_payments ADD CONSTRAINT IF NOT EXISTS kisaan_payments_transaction_id_fkey 
    FOREIGN KEY (transaction_id) REFERENCES kisaan_transactions(id);

-- Commissions foreign keys
ALTER TABLE kisaan_commissions ADD CONSTRAINT IF NOT EXISTS kisaan_commissions_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);

-- Shop Categories foreign keys
ALTER TABLE kisaan_shop_categories ADD CONSTRAINT IF NOT EXISTS kisaan_shop_categories_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);
ALTER TABLE kisaan_shop_categories ADD CONSTRAINT IF NOT EXISTS kisaan_shop_categories_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES kisaan_categories(id);

-- Shop Products foreign keys
ALTER TABLE kisaan_shop_products ADD CONSTRAINT IF NOT EXISTS kisaan_shop_products_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);
ALTER TABLE kisaan_shop_products ADD CONSTRAINT IF NOT EXISTS kisaan_shop_products_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES kisaan_products(id);

-- Credits foreign keys
ALTER TABLE kisaan_credits ADD CONSTRAINT IF NOT EXISTS kisaan_credits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES kisaan_users(id);
ALTER TABLE kisaan_credits ADD CONSTRAINT IF NOT EXISTS kisaan_credits_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);

-- Settlements foreign keys
ALTER TABLE kisaan_settlements ADD CONSTRAINT IF NOT EXISTS kisaan_settlements_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);
ALTER TABLE kisaan_settlements ADD CONSTRAINT IF NOT EXISTS kisaan_settlements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES kisaan_users(id);
ALTER TABLE kisaan_settlements ADD CONSTRAINT IF NOT EXISTS kisaan_settlements_transaction_id_fkey 
    FOREIGN KEY (transaction_id) REFERENCES kisaan_transactions(id);

-- Audit Logs foreign keys
ALTER TABLE kisaan_audit_logs ADD CONSTRAINT IF NOT EXISTS kisaan_audit_logs_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE SET NULL;
ALTER TABLE kisaan_audit_logs ADD CONSTRAINT IF NOT EXISTS kisaan_audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE SET NULL;

-- Plan Usage foreign keys
ALTER TABLE kisaan_plan_usage ADD CONSTRAINT IF NOT EXISTS kisaan_plan_usage_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id);
ALTER TABLE kisaan_plan_usage ADD CONSTRAINT IF NOT EXISTS kisaan_plan_usage_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES kisaan_plans(id);

-- Payment Allocations foreign keys
ALTER TABLE payment_allocations ADD CONSTRAINT IF NOT EXISTS payment_allocations_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES kisaan_payments(id);
ALTER TABLE payment_allocations ADD CONSTRAINT IF NOT EXISTS payment_allocations_transaction_id_fkey 
    FOREIGN KEY (transaction_id) REFERENCES kisaan_transactions(id);

-- Balance Snapshots foreign keys
ALTER TABLE balance_snapshots ADD CONSTRAINT IF NOT EXISTS balance_snapshots_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES kisaan_users(id);
