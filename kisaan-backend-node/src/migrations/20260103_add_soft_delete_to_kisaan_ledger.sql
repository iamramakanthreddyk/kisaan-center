-- Migration: Add soft delete fields to kisaan_ledger table
-- Date: 20260103
-- Description: Adds soft delete functionality to prevent permanent data loss

-- Add soft delete columns to kisaan_ledger table
ALTER TABLE kisaan_ledger
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE kisaan_ledger
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE kisaan_ledger
ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

ALTER TABLE kisaan_ledger
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index on is_deleted for efficient querying
CREATE INDEX IF NOT EXISTS idx_kisaan_ledger_is_deleted ON kisaan_ledger(is_deleted);