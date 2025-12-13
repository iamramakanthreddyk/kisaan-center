-- Migration: Normalize commissions & transactions timestamp columns (remove legacy camelCase quoted columns)
-- Date: 2025-09-25
-- Purpose: Some earlier migrations / seeds created quoted "createdAt" / "updatedAt" columns on
--          kisaan_commissions and kisaan_transactions in addition to proper snake_case versions.
--          This causes NOT NULL constraint violations when Sequelize maps to created_at/updated_at while
--          the DB still enforces NOT NULL on the quoted camelCase columns (which are not being written).
-- Strategy: Ensure snake_case columns exist (add if missing), backfill from camelCase, then drop camelCase.
-- Idempotent: Only acts if camelCase columns exist. Safe for repeated runs.

BEGIN;

-- Helper DO block for a table
DO $$
DECLARE camel_created_exists int; DECLARE camel_updated_exists int; BEGIN
    -- Commission table
    SELECT COUNT(*) INTO camel_created_exists FROM information_schema.columns WHERE table_name='kisaan_commissions' AND column_name='createdAt';
    SELECT COUNT(*) INTO camel_updated_exists FROM information_schema.columns WHERE table_name='kisaan_commissions' AND column_name='updatedAt';

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_commissions' AND column_name='created_at') THEN
        ALTER TABLE kisaan_commissions ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_commissions' AND column_name='updated_at') THEN
        ALTER TABLE kisaan_commissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF camel_created_exists = 1 THEN
        EXECUTE 'UPDATE kisaan_commissions SET created_at = COALESCE(created_at, "createdAt") WHERE "createdAt" IS NOT NULL AND created_at IS NULL';
    END IF;
    IF camel_updated_exists = 1 THEN
        EXECUTE 'UPDATE kisaan_commissions SET updated_at = COALESCE(updated_at, "updatedAt") WHERE "updatedAt" IS NOT NULL AND updated_at IS NULL';
    END IF;

    IF camel_created_exists = 1 THEN ALTER TABLE kisaan_commissions DROP COLUMN "createdAt"; END IF;
    IF camel_updated_exists = 1 THEN ALTER TABLE kisaan_commissions DROP COLUMN "updatedAt"; END IF;
END $$;

DO $$
DECLARE camel_created_exists int; DECLARE camel_updated_exists int; BEGIN
    -- Transactions table
    SELECT COUNT(*) INTO camel_created_exists FROM information_schema.columns WHERE table_name='kisaan_transactions' AND column_name='createdAt';
    SELECT COUNT(*) INTO camel_updated_exists FROM information_schema.columns WHERE table_name='kisaan_transactions' AND column_name='updatedAt';

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_transactions' AND column_name='created_at') THEN
        ALTER TABLE kisaan_transactions ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_transactions' AND column_name='updated_at') THEN
        ALTER TABLE kisaan_transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF camel_created_exists = 1 THEN
        EXECUTE 'UPDATE kisaan_transactions SET created_at = COALESCE(created_at, "createdAt") WHERE "createdAt" IS NOT NULL AND created_at IS NULL';
    END IF;
    IF camel_updated_exists = 1 THEN
        EXECUTE 'UPDATE kisaan_transactions SET updated_at = COALESCE(updated_at, "updatedAt") WHERE "updatedAt" IS NOT NULL AND updated_at IS NULL';
    END IF;

    IF camel_created_exists = 1 THEN ALTER TABLE kisaan_transactions DROP COLUMN "createdAt"; END IF;
    IF camel_updated_exists = 1 THEN ALTER TABLE kisaan_transactions DROP COLUMN "updatedAt"; END IF;
END $$;

COMMIT;

-- Rollback note: This migration is destructive only for camelCase duplicate columns; no rollback provided.