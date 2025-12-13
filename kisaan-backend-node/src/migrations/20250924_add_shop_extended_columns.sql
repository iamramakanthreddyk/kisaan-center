-- Migration: Add extended columns to kisaan_shops
-- Idempotent: checks existence before adding
-- Date: 2025-09-24

-- location column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='kisaan_shops' AND column_name='location'
    ) THEN
        ALTER TABLE kisaan_shops ADD COLUMN location TEXT;
    END IF;
END$$;

-- email column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='kisaan_shops' AND column_name='email'
    ) THEN
        ALTER TABLE kisaan_shops ADD COLUMN email TEXT;
    END IF;
END$$;

-- commission_rate column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='kisaan_shops' AND column_name='commission_rate'
    ) THEN
        ALTER TABLE kisaan_shops ADD COLUMN commission_rate NUMERIC(10,2) DEFAULT 0;
    END IF;
END$$;

-- settings column (JSONB)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='kisaan_shops' AND column_name='settings'
    ) THEN
        ALTER TABLE kisaan_shops ADD COLUMN settings JSONB;
    END IF;
END$$;
