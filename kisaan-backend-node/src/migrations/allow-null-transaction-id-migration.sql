-- Migration to allow transaction_id to be nullable in kisaan_payments table
-- This enables balance payments that are not tied to specific transactions

-- First, drop the existing foreign key constraint
ALTER TABLE kisaan_payments DROP CONSTRAINT IF EXISTS kisaan_payments_transaction_id_fkey;

-- Make transaction_id nullable
ALTER TABLE kisaan_payments ALTER COLUMN transaction_id DROP NOT NULL;

-- Re-add the foreign key constraint allowing nulls
ALTER TABLE kisaan_payments
ADD CONSTRAINT kisaan_payments_transaction_id_fkey
FOREIGN KEY (transaction_id)
REFERENCES kisaan_transactions(id)
ON DELETE SET NULL;