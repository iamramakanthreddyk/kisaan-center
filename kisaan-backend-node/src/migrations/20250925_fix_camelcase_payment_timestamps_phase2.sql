-- Phase 2 cleanup of payment timestamp columns
-- Handles scenario where BOTH camelCase (createdAt/updatedAt) and snake_case (created_at/updated_at) exist
-- or where camelCase columns still exist as NOT NULL causing insert failures.

DO $$
BEGIN
    -- If both createdAt and created_at exist, backfill then drop createdAt
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='createdAt')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='created_at') THEN
        -- Backfill snake_case with camelCase where null
        EXECUTE 'UPDATE kisaan_payments SET created_at = "createdAt" WHERE created_at IS NULL';
        -- Drop legacy column
        ALTER TABLE kisaan_payments DROP COLUMN "createdAt";
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='createdAt') THEN
        -- Only camelCase exists: rename it
        ALTER TABLE kisaan_payments RENAME COLUMN "createdAt" TO created_at;
    END IF;

    -- Ensure default + not null
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='created_at') THEN
        ALTER TABLE kisaan_payments ALTER COLUMN created_at SET DEFAULT NOW();
        ALTER TABLE kisaan_payments ALTER COLUMN created_at SET NOT NULL;
    END IF;

    -- Repeat for updatedAt
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updatedAt')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updated_at') THEN
        EXECUTE 'UPDATE kisaan_payments SET updated_at = COALESCE(updated_at, "updatedAt")';
        ALTER TABLE kisaan_payments DROP COLUMN "updatedAt";
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updatedAt') THEN
        ALTER TABLE kisaan_payments RENAME COLUMN "updatedAt" TO updated_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updated_at') THEN
        ALTER TABLE kisaan_payments ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE kisaan_payments ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;