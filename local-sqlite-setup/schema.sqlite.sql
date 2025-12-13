-- KisaanCenter SQLite Schema (for local development)
-- This is a simplified version of the production PostgreSQL schema

-- Categories table
CREATE TABLE IF NOT EXISTS kisaan_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Plans table
CREATE TABLE IF NOT EXISTS kisaan_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price REAL,
    billing_cycle TEXT DEFAULT 'monthly',
    monthly_price REAL,
    quarterly_price REAL,
    yearly_price REAL,
    max_farmers INTEGER,
    max_buyers INTEGER,
    max_transactions INTEGER,
    data_retention_months INTEGER,
    features TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS kisaan_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('superadmin', 'owner', 'farmer', 'buyer')),
    shop_id INTEGER,
    contact TEXT,
    email TEXT,
    firstname TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    balance REAL NOT NULL DEFAULT 0.00,
    cumulative_value REAL NOT NULL DEFAULT 0.00,
    custom_commission_rate REAL,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kisaan_shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    plan_id INTEGER,
    location TEXT,
    address TEXT,
    contact TEXT,
    email TEXT,
    commission_rate DECIMAL(10, 2) DEFAULT 0,
    settings TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- Products table
CREATE TABLE IF NOT EXISTS kisaan_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    description TEXT,
    price REAL,
    record_status TEXT,
    unit TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS kisaan_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    farmer_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_sale_value REAL NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    commission_amount REAL,
    shop_commission REAL NOT NULL,
    farmer_earning REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS kisaan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    payer_type TEXT NOT NULL,
    payee_type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payment_date TEXT,
    method TEXT NOT NULL,
    notes TEXT,
    shop_id INTEGER,
    counterparty_id INTEGER,
    product_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table
CREATE TABLE IF NOT EXISTS kisaan_commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    rate REAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Shop Categories junction table
CREATE TABLE IF NOT EXISTS kisaan_shop_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Shop Products junction table
CREATE TABLE IF NOT EXISTS kisaan_shop_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Credits table
CREATE TABLE IF NOT EXISTS kisaan_credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settlements table
CREATE TABLE IF NOT EXISTS kisaan_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    transaction_id INTEGER,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    settlement_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS kisaan_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    old_values TEXT,
    new_values TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Plan Usage table
CREATE TABLE IF NOT EXISTS kisaan_plan_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payment Allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    allocated_amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Balance Snapshots table
CREATE TABLE IF NOT EXISTS balance_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    balance_type TEXT NOT NULL DEFAULT 'farmer',
    previous_balance REAL NOT NULL DEFAULT 0.00,
    amount_change REAL NOT NULL DEFAULT 0.00,
    new_balance REAL NOT NULL DEFAULT 0.00,
    transaction_type TEXT NOT NULL DEFAULT 'adjustment',
    reference_id INTEGER,
    reference_type TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Features table
CREATE TABLE IF NOT EXISTS kisaan_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(60),
    description TEXT,
    default_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Plan Features table (which features are enabled for each plan)
CREATE TABLE IF NOT EXISTS kisaan_plan_features (
    plan_id INTEGER NOT NULL,
    feature_code VARCHAR(100) NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (plan_id, feature_code)
);

-- User Feature Overrides table (user-specific feature overrides)
CREATE TABLE IF NOT EXISTS kisaan_user_feature_overrides (
    user_id INTEGER NOT NULL,
    feature_code VARCHAR(100) NOT NULL,
    enabled INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, feature_code)
);

-- Default Features
INSERT OR IGNORE INTO kisaan_features (code, name, category, description, default_enabled) VALUES
('transactions.history.full', 'Full Transaction History', 'transactions', 'Access all historical transactions beyond default window', 0),
('transactions.list', 'List Transactions', 'transactions', 'Access paginated transaction lists', 1),
('transactions.analytics', 'Transaction Analytics', 'transactions', 'Access aggregated transaction analytics endpoints', 1),
('reports.generate', 'Generate Reports', 'reports', 'Generate JSON/Excel/PDF reports (view only)', 1),
('reports.download', 'Download Reports', 'reports', 'Download reports (PDF / Excel)', 0),
('data.retention.unlimited', 'Unlimited Data Retention', 'data', 'Bypass data retention limits', 0);



CREATE TABLE IF NOT EXISTS kisaan_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    farmer_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
    category TEXT NOT NULL CHECK(category IN ('sale', 'expense', 'withdrawal', 'other')),
    notes TEXT,
    commission_amount REAL,
    net_amount REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_shop ON kisaan_ledger(shop_id);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_farmer ON kisaan_ledger(farmer_id);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_shop_created_at ON kisaan_ledger(shop_id, created_at);

