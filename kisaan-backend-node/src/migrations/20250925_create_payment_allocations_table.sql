-- Migration: Create payment_allocations table (idempotent)
-- Simplified to avoid DO blocks so it runs cleanly via Sequelize raw runner.

CREATE TABLE IF NOT EXISTS payment_allocations (
  id SERIAL PRIMARY KEY,
  payment_id INT NOT NULL REFERENCES kisaan_payments(id) ON DELETE CASCADE,
  transaction_id INT NOT NULL REFERENCES kisaan_transactions(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Defensive: ensure allocated_amount column exists (older environments)
ALTER TABLE payment_allocations
  ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_transaction_id ON payment_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_tx_payment ON payment_allocations(transaction_id, payment_id);

-- (Optional trigger for updated_at omitted for simplicity; app logic can update if needed.)
