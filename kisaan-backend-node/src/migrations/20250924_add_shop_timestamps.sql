-- Migration: Ensure timestamp columns exist on kisaan_shops
-- Date: 2025-09-24
-- Purpose: Fix runtime errors: column "created_at" does not exist when inserting via Sequelize with timestamps mapping.
-- Safe / idempotent: Only adds columns if they are missing and backfills existing rows.

BEGIN;

DO $$
DECLARE col_exists int;
BEGIN
    SELECT COUNT(*) INTO col_exists FROM information_schema.columns 
      WHERE table_name='kisaan_shops' AND column_name='created_at';
    IF col_exists = 0 THEN
        ALTER TABLE kisaan_shops ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        -- Backfill any existing rows (DEFAULT handles new rows)
        UPDATE kisaan_shops SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    END IF;

    SELECT COUNT(*) INTO col_exists FROM information_schema.columns 
      WHERE table_name='kisaan_shops' AND column_name='updated_at';
    IF col_exists = 0 THEN
        ALTER TABLE kisaan_shops ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        UPDATE kisaan_shops SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
    END IF;
END $$;

COMMIT;
