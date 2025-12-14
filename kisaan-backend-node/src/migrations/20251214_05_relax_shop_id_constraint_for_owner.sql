-- Migration: Relax shop_id_required_for_roles constraint
-- Purpose: allow creating 'owner' users without an existing shop during owner+shop creation flow

DO $$
BEGIN
    -- If the constraint exists, drop it so we can re-create a relaxed version
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_id_required_for_roles') THEN
        ALTER TABLE kisaan_users DROP CONSTRAINT IF EXISTS shop_id_required_for_roles;
    END IF;

    -- Recreate the constraint: require shop_id only for roles that need an existing shop
    -- Owners and admins may be created without shop_id; farmers and buyers must have shop_id
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_id_required_for_roles') THEN
        ALTER TABLE kisaan_users
        ADD CONSTRAINT shop_id_required_for_roles
        CHECK (
            (role IN ('farmer', 'buyer') AND shop_id IS NOT NULL)
            OR role IN ('superadmin', 'owner', 'admin')
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not modify shop_id_required_for_roles constraint: %', SQLERRM;
END$$;
