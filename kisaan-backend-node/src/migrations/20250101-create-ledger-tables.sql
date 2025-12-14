-- Migration: Create Ledger-Based Accounting Tables
-- Purpose: Replace delta-based balance tracking with append-only ledger + pre-calculated balances
-- This fixes the 99,680 buyer balance bug by eliminating accumulation errors

-- Create the append-only ledger table
CREATE TABLE IF NOT EXISTS kisaan_ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  
  -- Link to user (farmer or buyer)
  user_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  
  -- Transaction direction (DEBIT = amount owed, CREDIT = payment received)
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  
  -- Amount in transaction
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  
  -- Type of transaction (TRANSACTION, PAYMENT, EXPENSE, ADVANCE, etc.)
  type VARCHAR(50) NOT NULL,
  
  -- Reference to original transaction/payment/expense
  reference_type VARCHAR(50),
  reference_id BIGINT,
  
  -- Human-readable description
  description TEXT,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  
  -- Indexes for fast lookups
  CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE RESTRICT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ledger_user_shop ON kisaan_ledger_entries(user_id, shop_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON kisaan_ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON kisaan_ledger_entries(type);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON kisaan_ledger_entries(reference_type, reference_id);


-- Create the pre-calculated balance table
-- This is the single source of truth for current balance
CREATE TABLE IF NOT EXISTS kisaan_user_balances (
  id BIGSERIAL PRIMARY KEY,
  
  -- User and shop
  user_id BIGINT NOT NULL,
  shop_id BIGINT NOT NULL,
  
  -- Current balance: SUM of all (CREDIT amounts - DEBIT amounts)
  -- Positive = farmer/buyer is owed money, Negative = they owe money
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Optimistic locking: increment on every update to detect conflicts
  version INT NOT NULL DEFAULT 0,
  
  -- When was this last updated (for reconciliation)
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: one row per user-shop pair
  CONSTRAINT uk_user_balance_unique UNIQUE (user_id, shop_id),
  CONSTRAINT fk_balance_user FOREIGN KEY (user_id) REFERENCES kisaan_users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_balance_shop FOREIGN KEY (shop_id) REFERENCES kisaan_shops(id) ON DELETE RESTRICT
);

-- Index for fast lookups by user and shop
CREATE INDEX IF NOT EXISTS idx_balance_user_shop ON kisaan_user_balances(user_id, shop_id);


-- Add created_by column to kisaan_expenses if it doesn't exist
-- (needed for audit trail compatibility)
ALTER TABLE IF EXISTS kisaan_expenses 
ADD COLUMN IF NOT EXISTS created_by BIGINT;

-- Verify tables are created
SELECT 
  tablename, 
  'kisaan_ledger_entries' as ledger_table
FROM pg_tables 
WHERE tablename = 'kisaan_ledger_entries'
UNION ALL
SELECT 
  tablename,
  'kisaan_user_balances' as ledger_table
FROM pg_tables 
WHERE tablename = 'kisaan_user_balances';

