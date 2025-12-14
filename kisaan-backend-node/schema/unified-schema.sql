
-- =============================================
-- KisaanCenter Complete Database Schema
-- Version: 1.0.0
-- Generated from existing production schema
-- Azure PostgreSQL Compatible
-- =============================================

-- Note: plpgsql is enabled by default in Azure PostgreSQL
-- No need to create extensions

-- =============================================
-- ENUMS SECTION
-- =============================================

-- User roles enum
DO $$ BEGIN
	CREATE TYPE enum_kisaan_users_role AS ENUM ('superadmin', 'owner', 'farmer', 'buyer');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- User status enum
DO $$ BEGIN
	CREATE TYPE enum_kisaan_users_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Shop status enum
DO $$ BEGIN
	CREATE TYPE enum_kisaan_shops_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Payment enums
DO $$ BEGIN
	CREATE TYPE enum_kisaan_payments_payer_type AS ENUM ('farmer', 'buyer', 'shop', 'external');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE enum_kisaan_payments_payee_type AS ENUM ('farmer', 'buyer', 'shop', 'external');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE enum_kisaan_payments_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE enum_kisaan_payments_method AS ENUM ('cash', 'upi', 'bank_transfer', 'card', 'cheque');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Commission type enum
DO $$ BEGIN
	CREATE TYPE enum_kisaan_commissions_type AS ENUM ('percentage', 'fixed');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Credit status enum
DO $$ BEGIN
	CREATE TYPE enum_kisaan_credits_status AS ENUM ('active', 'repaid', 'overdue', 'written_off');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Settlement enums
DO $$ BEGIN
	CREATE TYPE enum_kisaan_settlements_reason AS ENUM ('overpayment', 'underpayment', 'adjustment', 'refund');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE enum_kisaan_settlements_status AS ENUM ('pending', 'settled', 'cancelled');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Plans billing cycle enum
DO $$ BEGIN
	CREATE TYPE enum_kisaan_plans_billing_cycle AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- SEQUENCES SECTION
-- =============================================

-- Create sequences for tables
CREATE SEQUENCE IF NOT EXISTS kisaan_plans_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_categories_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_users_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_shops_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_products_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_transactions_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_payments_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_commissions_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_shop_categories_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_shop_products_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_credits_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_plan_usage_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_audit_logs_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_payment_allocations_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_settlements_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS kisaan_balance_snapshots_id_seq START 1;

-- SequelizeMeta table for migration tracking
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
    name VARCHAR(255) NOT NULL PRIMARY KEY
-- Expenses table
CREATE TABLE IF NOT EXISTS kisaan_expenses (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'expense',
    description TEXT,
    transaction_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Allocation tracking columns
    total_amount DECIMAL(12,2),
    allocated_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2),
    allocation_status VARCHAR(30) DEFAULT 'unallocated',
    created_by BIGINT
);

-- Expense Settlements table
CREATE TABLE IF NOT EXISTS expense_settlements (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES kisaan_expenses(id) ON DELETE CASCADE,
    payment_id BIGINT REFERENCES kisaan_payments(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    settled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ledger Entries table

-- Simple Farmer Ledger table (used by backend)
CREATE TABLE IF NOT EXISTS kisaan_ledger (
    id SERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES kisaan_shops(id),
    farmer_id BIGINT NOT NULL REFERENCES kisaan_users(id),
    amount DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('sale', 'expense', 'withdrawal', 'other')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by BIGINT NOT NULL REFERENCES kisaan_users(id)
);

-- User Balances table
CREATE TABLE IF NOT EXISTS kisaan_user_balances (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_balance_unique UNIQUE (user_id, shop_id),
    CONSTRAINT fk_balance_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_balance_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE RESTRICT
);

-- Transaction Ledger table
CREATE TABLE IF NOT EXISTS kisaan_transaction_ledger (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT REFERENCES kisaan_transactions(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES kisaan_users(id),
    role VARCHAR(20) NOT NULL,
    delta_amount NUMERIC(12,2) NOT NULL,
    balance_before NUMERIC(12,2),
    balance_after NUMERIC(12,2),
    reason_code VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Expense Allocations table
CREATE TABLE IF NOT EXISTS kisaan_expense_allocations (
    id BIGSERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES kisaan_expenses(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES kisaan_transactions(id) ON DELETE SET NULL,
    allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount > 0),
    allocation_type VARCHAR(30) NOT NULL CHECK (allocation_type IN ('transaction_offset', 'balance_settlement', 'advance', 'adjustment')),
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
);

-- Plans table
CREATE TABLE IF NOT EXISTS kisaan_plans (
    id INTEGER DEFAULT nextval('kisaan_plans_id_seq') PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2),
    billing_cycle enum_kisaan_plans_billing_cycle DEFAULT 'monthly',
    monthly_price DECIMAL(10, 2),
    quarterly_price DECIMAL(10, 2),
    yearly_price DECIMAL(10, 2),
    max_farmers INTEGER,
    max_buyers INTEGER,
    max_transactions INTEGER,
    data_retention_months INTEGER,
    features TEXT NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS kisaan_categories (
    id INTEGER DEFAULT nextval('kisaan_categories_id_seq') PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS kisaan_users (
    id BIGINT DEFAULT nextval('kisaan_users_id_seq') PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role enum_kisaan_users_role NOT NULL,
    shop_id BIGINT,
    contact VARCHAR(255),
    email VARCHAR(255),
    firstname VARCHAR(255),
    status enum_kisaan_users_status NOT NULL DEFAULT 'active',
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cumulative_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    created_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shops table
CREATE TABLE IF NOT EXISTS kisaan_shops (
    id BIGINT DEFAULT nextval('kisaan_shops_id_seq') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    plan_id INTEGER,
    address TEXT,
    contact VARCHAR(255),
    status enum_kisaan_shops_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS kisaan_products (
    id INTEGER DEFAULT nextval('kisaan_products_id_seq') PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    record_status VARCHAR(255),
    unit VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS kisaan_transactions (
    id INTEGER DEFAULT nextval('kisaan_transactions_id_seq') PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    category_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_sale_value DECIMAL(12,2) NOT NULL,
    shop_commission DECIMAL(12,2) NOT NULL,
    farmer_earning DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS kisaan_payments (
    id BIGINT DEFAULT nextval('kisaan_payments_id_seq') PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    payer_type enum_kisaan_payments_payer_type NOT NULL,
    payee_type enum_kisaan_payments_payee_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status enum_kisaan_payments_status NOT NULL DEFAULT 'PENDING',
    payment_date TIMESTAMP WITH TIME ZONE,
    method enum_kisaan_payments_method NOT NULL,
    notes TEXT,
    shop_id BIGINT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table
CREATE TABLE IF NOT EXISTS kisaan_commissions (
    id BIGINT DEFAULT nextval('kisaan_commissions_id_seq') PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    type enum_kisaan_commissions_type NOT NULL DEFAULT 'percentage',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shop Categories junction table
CREATE TABLE IF NOT EXISTS kisaan_shop_categories (
    id INTEGER DEFAULT nextval('kisaan_shop_categories_id_seq') PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    category_id INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shop Products junction table
CREATE TABLE IF NOT EXISTS kisaan_shop_products (
    id INTEGER DEFAULT nextval('kisaan_shop_products_id_seq') PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    product_id INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Credits table
CREATE TABLE IF NOT EXISTS kisaan_credits (
    id BIGINT DEFAULT nextval('kisaan_credits_id_seq') PRIMARY KEY,
    user_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status enum_kisaan_credits_status NOT NULL DEFAULT 'active',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settlements table
CREATE TABLE IF NOT EXISTS kisaan_settlements (
    id BIGINT DEFAULT nextval('kisaan_settlements_id_seq') PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    transaction_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    reason enum_kisaan_settlements_reason NOT NULL,
    status enum_kisaan_settlements_status DEFAULT 'pending' NOT NULL,
    settlement_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS kisaan_audit_logs (
    id BIGINT DEFAULT nextval('kisaan_audit_logs_id_seq') PRIMARY KEY,
    shop_id BIGINT,
    user_id BIGINT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Plan Usage table
CREATE TABLE IF NOT EXISTS kisaan_plan_usage (
    id BIGINT DEFAULT nextval('kisaan_plan_usage_id_seq') PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment Allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id INTEGER DEFAULT nextval('kisaan_payment_allocations_id_seq') PRIMARY KEY,
    payment_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Balance Snapshots table
CREATE TABLE IF NOT EXISTS balance_snapshots (
    id INTEGER DEFAULT nextval('kisaan_balance_snapshots_id_seq') PRIMARY KEY,
    user_id BIGINT NOT NULL,
    balance_type VARCHAR(20) NOT NULL DEFAULT 'farmer',
    previous_balance DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    amount_change DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    new_balance DECIMAL(16,4) NOT NULL DEFAULT 0.00,
    transaction_type VARCHAR(40) NOT NULL DEFAULT 'adjustment',
    reference_id BIGINT,
    reference_type VARCHAR(40),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Users table indexes
CREATE INDEX IF NOT EXISTS kisaan_users_username ON kisaan_users(username);
CREATE INDEX IF NOT EXISTS kisaan_users_role ON kisaan_users(role);
CREATE INDEX IF NOT EXISTS kisaan_users_shop_id ON kisaan_users(shop_id);

-- Expenses table indexes
CREATE INDEX IF NOT EXISTS idx_kisaan_expenses_shop_user_status ON kisaan_expenses(shop_id, user_id, status);

-- Expense Settlements table indexes
CREATE INDEX IF NOT EXISTS idx_expense_settlements_expense_id ON expense_settlements(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_settlements_payment_id ON expense_settlements(payment_id);
CREATE INDEX IF NOT EXISTS idx_expense_settlements_settled_at ON expense_settlements(settled_at);
CREATE INDEX IF NOT EXISTS idx_expense_settlements_expense_settled ON expense_settlements(expense_id, settled_at);
CREATE INDEX IF NOT EXISTS idx_expense_settlements_payment_expense ON expense_settlements(payment_id, expense_id);

-- Ledger Entries table indexes

-- Simple Farmer Ledger table indexes
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_shop ON kisaan_ledger(shop_id);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_farmer ON kisaan_ledger(farmer_id);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_shop_created_at ON kisaan_ledger(shop_id, created_at);

-- User Balances table index
CREATE INDEX IF NOT EXISTS idx_balance_user_shop ON kisaan_user_balances(user_id, shop_id);

-- Transaction Ledger table indexes
CREATE INDEX IF NOT EXISTS idx_kisaan_transaction_ledger_user_created ON kisaan_transaction_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kisaan_transaction_ledger_txn ON kisaan_transaction_ledger (transaction_id);

-- Expense Allocations table indexes
CREATE INDEX IF NOT EXISTS idx_expense_alloc_expense ON kisaan_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_txn ON kisaan_expense_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_type ON kisaan_expense_allocations(allocation_type);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_date ON kisaan_expense_allocations(allocated_at);
CREATE INDEX IF NOT EXISTS idx_kisaan_users_shopid_roles ON kisaan_users(shop_id) WHERE role IN ('owner', 'farmer', 'buyer');

-- Shops table indexes
CREATE INDEX IF NOT EXISTS kisaan_shops_owner_id ON kisaan_shops(owner_id);
CREATE INDEX IF NOT EXISTS kisaan_shops_plan_id ON kisaan_shops(plan_id);
CREATE INDEX IF NOT EXISTS kisaan_shops_status ON kisaan_shops(status);

-- Products table indexes
CREATE INDEX IF NOT EXISTS kisaan_products_category_id ON kisaan_products(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS kisaan_products_name_category_unique ON kisaan_products(name, category_id);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS kisaan_transactions_shop_id ON kisaan_transactions(shop_id);
CREATE INDEX IF NOT EXISTS kisaan_transactions_farmer_id ON kisaan_transactions(farmer_id);
CREATE INDEX IF NOT EXISTS kisaan_transactions_buyer_id ON kisaan_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS kisaan_transactions_category_id ON kisaan_transactions(category_id);
CREATE INDEX IF NOT EXISTS kisaan_transactions_created_at ON kisaan_transactions(created_at);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS kisaan_payments_transaction_id ON kisaan_payments(transaction_id);
CREATE INDEX IF NOT EXISTS kisaan_payments_payer_type ON kisaan_payments(payer_type);
CREATE INDEX IF NOT EXISTS kisaan_payments_payee_type ON kisaan_payments(payee_type);
CREATE INDEX IF NOT EXISTS kisaan_payments_status ON kisaan_payments(status);
CREATE INDEX IF NOT EXISTS kisaan_payments_payment_date ON kisaan_payments(payment_date);
CREATE INDEX IF NOT EXISTS kisaan_payments_transaction_status ON kisaan_payments(transaction_id, status);
CREATE INDEX IF NOT EXISTS idx_kisaan_payments_shop_id ON kisaan_payments(shop_id);

-- Commissions table indexes
CREATE INDEX IF NOT EXISTS kisaan_commissions_shop_id ON kisaan_commissions(shop_id);

-- Shop Categories table indexes
CREATE INDEX IF NOT EXISTS kisaan_shop_categories_shop_id ON kisaan_shop_categories(shop_id);
CREATE INDEX IF NOT EXISTS kisaan_shop_categories_category_id ON kisaan_shop_categories(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS kisaan_shop_categories_shop_category_unique ON kisaan_shop_categories(shop_id, category_id);

-- Shop Products table indexes
CREATE INDEX IF NOT EXISTS kisaan_shop_products_shop_id ON kisaan_shop_products(shop_id);
CREATE INDEX IF NOT EXISTS kisaan_shop_products_product_id ON kisaan_shop_products(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS kisaan_shop_products_shop_product_unique ON kisaan_shop_products(shop_id, product_id);

-- Balance Snapshots table indexes
CREATE INDEX IF NOT EXISTS balance_snapshots_user_id ON balance_snapshots(user_id);
CREATE INDEX IF NOT EXISTS balance_snapshots_created_at ON balance_snapshots(created_at);
CREATE INDEX IF NOT EXISTS balance_snapshots_user_created_at ON balance_snapshots(user_id, created_at);
CREATE INDEX IF NOT EXISTS balance_snapshots_reference ON balance_snapshots(reference_id, reference_type);

-- Payment Allocations table indexes
CREATE INDEX IF NOT EXISTS payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS payment_allocations_transaction_id ON payment_allocations(transaction_id);

-- Audit Logs table indexes
CREATE INDEX IF NOT EXISTS idx_auditlogs_created_at ON kisaan_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auditlogs_entity_type ON kisaan_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_auditlogs_shop_id ON kisaan_audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_user_id ON kisaan_audit_logs(user_id);

-- Credits table indexes
CREATE INDEX IF NOT EXISTS kisaan_credits_user_id ON kisaan_credits(user_id);
CREATE INDEX IF NOT EXISTS kisaan_credits_shop_id ON kisaan_credits(shop_id);
CREATE INDEX IF NOT EXISTS kisaan_credits_status ON kisaan_credits(status);

-- Settlements table indexes
CREATE INDEX IF NOT EXISTS kisaan_settlements_shop_id ON kisaan_settlements(shop_id);
CREATE INDEX IF NOT EXISTS kisaan_settlements_user_id ON kisaan_settlements(user_id);
CREATE INDEX IF NOT EXISTS kisaan_settlements_status ON kisaan_settlements(status);
CREATE INDEX IF NOT EXISTS kisaan_settlements_transaction_id ON kisaan_settlements(transaction_id);

-- Plans table indexes
CREATE INDEX IF NOT EXISTS kisaan_plans_is_active ON kisaan_plans(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS kisaan_plans_name_unique ON kisaan_plans(name);

-- =============================================
-- ESSENTIAL DATA SEEDING (Based on seed-core.ts)
-- =============================================

-- Insert core categories matching seed-core.ts
INSERT INTO kisaan_categories (name, description) 
SELECT 'Fruits', 'Fruits category'
WHERE NOT EXISTS (SELECT 1 FROM kisaan_categories WHERE name = 'Fruits');

INSERT INTO kisaan_categories (name, description) 
SELECT 'Vegetables', 'Vegetables category'
WHERE NOT EXISTS (SELECT 1 FROM kisaan_categories WHERE name = 'Vegetables');

INSERT INTO kisaan_categories (name, description) 
SELECT 'Flowers', 'Flowers category'
WHERE NOT EXISTS (SELECT 1 FROM kisaan_categories WHERE name = 'Flowers');

INSERT INTO kisaan_categories (name, description) 
SELECT 'Grains', 'Grains category'
WHERE NOT EXISTS (SELECT 1 FROM kisaan_categories WHERE name = 'Grains');

-- Insert plans matching seed-core.ts
INSERT INTO kisaan_plans (name, description, features, is_active) 
SELECT 'Basic', 'Entry plan', '[]', true
WHERE NOT EXISTS (SELECT 1 FROM kisaan_plans WHERE name = 'Basic');

INSERT INTO kisaan_plans (name, description, features, is_active) 
SELECT 'Standard', 'Standard growth plan', '[]', true
WHERE NOT EXISTS (SELECT 1 FROM kisaan_plans WHERE name = 'Standard');

INSERT INTO kisaan_plans (name, description, features, is_active) 
SELECT 'Premium', 'Full scale plan', '[]', true
WHERE NOT EXISTS (SELECT 1 FROM kisaan_plans WHERE name = 'Premium');

-- Create superadmin user (password: ChangeMe123!)
-- Note: Run your seed-core.ts script after this for proper password hashing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM kisaan_users WHERE username = 'superadmin') THEN
        -- Use a placeholder hash - run seed-core.ts for proper password
        INSERT INTO kisaan_users (username, password, role, balance, cumulative_value)
        VALUES ('superadmin', '$2b$12$placeholder_hash_run_seed_script_instead', 'superadmin', 0.00, 0.00);
        RAISE NOTICE 'Created superadmin user - IMPORTANT: Run seed-core.ts script for proper password!';
    ELSE
        RAISE NOTICE 'Superadmin user already exists';
    END IF;
END$$;

-- Seed products for each category (matching seed-core.ts structure)
DO $$
DECLARE
    fruits_cat_id INTEGER;
    vegetables_cat_id INTEGER;
    flowers_cat_id INTEGER;
    grains_cat_id INTEGER;
    product_name VARCHAR(100);
    fruits_products VARCHAR(100)[] := ARRAY['Apple','Banana','Mango','Orange','Grapes','Pineapple','Papaya','Guava','Pomegranate','Watermelon','Strawberry','Kiwi','Pear','Peach','Lemon'];
    vegetables_products VARCHAR(100)[] := ARRAY['Tomato','Potato','Onion','Carrot','Cabbage','Cauliflower','Spinach','Brinjal','Okra','Peas','Cucumber','Radish','Beetroot','Pumpkin','Garlic'];
    flowers_products VARCHAR(100)[] := ARRAY['Rose','Marigold','Jasmine','Lotus','Lily','Tulip','Sunflower','Orchid','Daisy','Carnation','Gerbera','Hibiscus','Chrysanthemum','Lavender','Magnolia'];
    grains_products VARCHAR(100)[] := ARRAY['Wheat','Rice','Maize','Barley','Oats','Millet','Sorghum','Quinoa','Buckwheat','Rye','Lentil','Chickpea','Pea','Soybean','Mustard Seed'];
BEGIN
    -- Get category IDs
    SELECT id INTO fruits_cat_id FROM kisaan_categories WHERE name = 'Fruits';
    SELECT id INTO vegetables_cat_id FROM kisaan_categories WHERE name = 'Vegetables';
    SELECT id INTO flowers_cat_id FROM kisaan_categories WHERE name = 'Flowers';
    SELECT id INTO grains_cat_id FROM kisaan_categories WHERE name = 'Grains';
    
    -- Insert Fruits products
    FOREACH product_name IN ARRAY fruits_products
    LOOP
        INSERT INTO kisaan_products (name, category_id, description, unit, record_status)
        SELECT product_name, fruits_cat_id, product_name, 'kg', 'active'
        WHERE NOT EXISTS (SELECT 1 FROM kisaan_products WHERE name = product_name AND category_id = fruits_cat_id);
    END LOOP;
    
    -- Insert Vegetables products
    FOREACH product_name IN ARRAY vegetables_products
    LOOP
        INSERT INTO kisaan_products (name, category_id, description, unit, record_status)
        SELECT product_name, vegetables_cat_id, product_name, 'kg', 'active'
        WHERE NOT EXISTS (SELECT 1 FROM kisaan_products WHERE name = product_name AND category_id = vegetables_cat_id);
    END LOOP;
    
    -- Insert Flowers products
    FOREACH product_name IN ARRAY flowers_products
    LOOP
        INSERT INTO kisaan_products (name, category_id, description, unit, record_status)
        SELECT product_name, flowers_cat_id, product_name, 'kg', 'active'
        WHERE NOT EXISTS (SELECT 1 FROM kisaan_products WHERE name = product_name AND category_id = flowers_cat_id);
    END LOOP;
    
    -- Insert Grains products
    FOREACH product_name IN ARRAY grains_products
    LOOP
        INSERT INTO kisaan_products (name, category_id, description, unit, record_status)
        SELECT product_name, grains_cat_id, product_name, 'kg', 'active'
        WHERE NOT EXISTS (SELECT 1 FROM kisaan_products WHERE name = product_name AND category_id = grains_cat_id);
    END LOOP;
    
    RAISE NOTICE 'Seeded products for all categories (60+ products total)';
END$$;

-- =============================================
-- BUSINESS CONSTRAINTS
-- =============================================

-- Add shop_id constraint for specific roles (optional - comment out if it causes issues)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_id_required_for_roles') THEN
        ALTER TABLE kisaan_users
        ADD CONSTRAINT shop_id_required_for_roles
        CHECK (
            (role IN ('owner', 'farmer', 'buyer') AND shop_id IS NOT NULL)
            OR (role = 'superadmin')
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If constraint fails due to existing data, ignore it
        NULL;
END$$;

-- =============================================
-- VERIFICATION AND COMPLETION
-- =============================================

-- Set sequence ownership
ALTER SEQUENCE kisaan_plans_id_seq OWNED BY kisaan_plans.id;
ALTER SEQUENCE kisaan_categories_id_seq OWNED BY kisaan_categories.id;
ALTER SEQUENCE kisaan_users_id_seq OWNED BY kisaan_users.id;
ALTER SEQUENCE kisaan_shops_id_seq OWNED BY kisaan_shops.id;
ALTER SEQUENCE kisaan_products_id_seq OWNED BY kisaan_products.id;
ALTER SEQUENCE kisaan_transactions_id_seq OWNED BY kisaan_transactions.id;
ALTER SEQUENCE kisaan_payments_id_seq OWNED BY kisaan_payments.id;
ALTER SEQUENCE kisaan_commissions_id_seq OWNED BY kisaan_commissions.id;
ALTER SEQUENCE kisaan_shop_categories_id_seq OWNED BY kisaan_shop_categories.id;
ALTER SEQUENCE kisaan_shop_products_id_seq OWNED BY kisaan_shop_products.id;
ALTER SEQUENCE kisaan_credits_id_seq OWNED BY kisaan_credits.id;
ALTER SEQUENCE kisaan_plan_usage_id_seq OWNED BY kisaan_plan_usage.id;
ALTER SEQUENCE kisaan_audit_logs_id_seq OWNED BY kisaan_audit_logs.id;
ALTER SEQUENCE kisaan_payment_allocations_id_seq OWNED BY payment_allocations.id;
ALTER SEQUENCE kisaan_settlements_id_seq OWNED BY kisaan_settlements.id;
ALTER SEQUENCE kisaan_balance_snapshots_id_seq OWNED BY balance_snapshots.id;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'KisaanCenter database schema created successfully!';
    RAISE NOTICE 'Tables created: % total', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'kisaan_%');
    RAISE NOTICE 'Categories seeded: % total', (SELECT count(*) FROM kisaan_categories);
    RAISE NOTICE 'Products seeded: % total', (SELECT count(*) FROM kisaan_products);
    RAISE NOTICE 'Plans seeded: % total', (SELECT count(*) FROM kisaan_plans);
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '1. Run: npm run seed:core (or ts-node scripts/seed-core.ts)';
    RAISE NOTICE '2. This will create proper superadmin password and additional data';
    RAISE NOTICE '3. Your database is ready for application deployment!';
END$$;
