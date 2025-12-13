-- Migration: Normalize shop timestamp columns (remove legacy camelCase columns)
-- Date: 2025-09-24
-- Purpose: Drop mistakenly created quoted columns "createdAt" / "updatedAt" (NOT NULL, no default)
--          that conflict with proper snake_case timestamp strategy (created_at / updated_at).
-- Idempotent: Only acts if the quoted columns exist. Preserves data if any values present.

BEGIN;

DO $$
DECLARE camel_created_exists int;
DECLARE camel_updated_exists int;
BEGIN
    SELECT COUNT(*) INTO camel_created_exists
      FROM information_schema.columns
     WHERE table_name='kisaan_shops' AND column_name='createdAt';

    SELECT COUNT(*) INTO camel_updated_exists
      FROM information_schema.columns
     WHERE table_name='kisaan_shops' AND column_name='updatedAt';

    -- Ensure snake_case columns exist (they should from prior migration); create if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name='kisaan_shops' AND column_name='created_at'
    ) THEN
        ALTER TABLE kisaan_shops ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name='kisaan_shops' AND column_name='updated_at'
    ) THEN
        ALTER TABLE kisaan_shops ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Backfill from camelCase to snake_case where snake_case null
    IF camel_created_exists = 1 THEN
        EXECUTE 'UPDATE kisaan_shops SET created_at = COALESCE(created_at, "createdAt") WHERE "createdAt" IS NOT NULL AND created_at IS NULL';
    END IF;
    IF camel_updated_exists = 1 THEN
        EXECUTE 'UPDATE kisaan_shops SET updated_at = COALESCE(updated_at, "updatedAt") WHERE "updatedAt" IS NOT NULL AND updated_at IS NULL';
    END IF;

    -- Drop camelCase columns if they exist
    IF camel_created_exists = 1 THEN
        ALTER TABLE kisaan_shops DROP COLUMN "createdAt";
    END IF;
    IF camel_updated_exists = 1 THEN
        ALTER TABLE kisaan_shops DROP COLUMN "updatedAt";
    END IF;
END $$;

COMMIT;
