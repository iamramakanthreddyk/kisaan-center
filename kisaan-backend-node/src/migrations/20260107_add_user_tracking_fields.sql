-- Migration: Add user tracking fields for login and activity monitoring
-- Date: 20260107
-- Description: Adds last_login, login_count, and last_activity fields to track user behavior

DO $$
BEGIN
    -- Add last_login column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'kisaan_users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE kisaan_users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_login column to kisaan_users';
    END IF;

    -- Add login_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'kisaan_users' AND column_name = 'login_count'
    ) THEN
        ALTER TABLE kisaan_users ADD COLUMN login_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added login_count column to kisaan_users';
    END IF;

    -- Add last_activity column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'kisaan_users' AND column_name = 'last_activity'
    ) THEN
        ALTER TABLE kisaan_users ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_activity column to kisaan_users';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding user tracking columns: %', SQLERRM;
END$$;