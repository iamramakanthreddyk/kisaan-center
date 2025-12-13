-- Simple Farmer Ledger Table for Minimal Book-Keeping
CREATE TABLE IF NOT EXISTS kisaan_ledger (
  id SERIAL PRIMARY KEY,
  shop_id BIGINT NOT NULL REFERENCES kisaan_shops(id),
  farmer_id BIGINT NOT NULL REFERENCES kisaan_users(id),
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('sale', 'expense', 'withdrawal', 'other')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by BIGINT REFERENCES kisaan_users(id)
);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_shop ON kisaan_ledger(shop_id);
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_farmer ON kisaan_ledger(farmer_id);
