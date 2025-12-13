-- Normalize camelCase timestamp columns for payments if legacy columns exist
-- Some older records/tables may still have createdAt / updatedAt NOT NULL without defaults
-- We want snake_case created_at / updated_at consistent with other tables

DO $$
BEGIN
    -- If legacy camelCase columns exist and snake_case missing, rename directly
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='createdAt')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='created_at') THEN
        ALTER TABLE kisaan_payments RENAME COLUMN "createdAt" TO created_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updatedAt')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updated_at') THEN
        ALTER TABLE kisaan_payments RENAME COLUMN "updatedAt" TO updated_at;
    END IF;

    -- Ensure NOT NULL + defaults
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='created_at') THEN
        ALTER TABLE kisaan_payments ALTER COLUMN created_at SET DEFAULT NOW();
        ALTER TABLE kisaan_payments ALTER COLUMN created_at SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kisaan_payments' AND column_name='updated_at') THEN
        ALTER TABLE kisaan_payments ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE kisaan_payments ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;