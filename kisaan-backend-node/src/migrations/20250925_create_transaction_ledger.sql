-- Migration: Create transaction ledger table (append-only balance movements)
-- Safe & idempotent. Mirrors design in schema/migrations/20250923_03_ledger.sql
-- Added here because runtime reported missing relation "kisaan_transaction_ledger" during transaction creation.
-- If table already exists this will NOOP due to IF NOT EXISTS guards.

BEGIN;

CREATE TABLE IF NOT EXISTS kisaan_transaction_ledger (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NULL REFERENCES kisaan_transactions(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES kisaan_users(id),
    role VARCHAR(20) NOT NULL, -- farmer | buyer | shop
    delta_amount NUMERIC(12,2) NOT NULL,
    balance_before NUMERIC(12,2) NULL,
    balance_after NUMERIC(12,2) NULL,
    reason_code VARCHAR(40) NOT NULL, -- e.g. TXN_POST
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kisaan_transaction_ledger_user_created ON kisaan_transaction_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kisaan_transaction_ledger_txn ON kisaan_transaction_ledger (transaction_id);

COMMIT;
