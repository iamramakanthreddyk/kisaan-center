-- Migration: Make shop owner_id nullable to solve circular dependency
-- Problem: Can't create owner without shop_id, can't create shop without owner_id
-- Solution: Allow owner_id to be NULL initially, populate after owner is created
-- Timestamp: 2025-12-14_12

DO $$
BEGIN
    -- Alter the kisaan_shops table to make owner_id nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kisaan_shops' 
        AND column_name = 'owner_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE kisaan_shops ALTER COLUMN owner_id DROP NOT NULL;
        RAISE NOTICE 'Successfully made owner_id nullable in kisaan_shops table';
    ELSE
        RAISE NOTICE 'owner_id is already nullable or column does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error modifying owner_id constraint: %', SQLERRM;
END$$;
