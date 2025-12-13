-- Migration: Add deleted_at column to kisaan_expenses if missing
ALTER TABLE kisaan_expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
