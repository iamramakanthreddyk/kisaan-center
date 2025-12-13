-- Migration: Add created_by column to kisaan_expenses if missing
ALTER TABLE kisaan_expenses ADD COLUMN IF NOT EXISTS created_by BIGINT;
