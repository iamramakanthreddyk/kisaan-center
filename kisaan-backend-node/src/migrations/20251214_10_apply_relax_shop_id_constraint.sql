-- Migration: Ensure shop_id_required_for_roles allows owner/admin/superadmin without shop_id
-- Timestamp: 2025-12-14_10

DO $$
BEGIN
    -- Drop existing constraint if it's the old strict version
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_id_required_for_roles') THEN
        ALTER TABLE kisaan_users DROP CONSTRAINT IF EXISTS shop_id_required_for_roles;
    END IF;

    -- Create the relaxed constraint: require shop_id only for farmer/buyer
    ALTER TABLE kisaan_users
    ADD CONSTRAINT shop_id_required_for_roles
    CHECK (
        (role IN ('farmer', 'buyer') AND shop_id IS NOT NULL)
        OR role IN ('superadmin', 'owner', 'admin')
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not modify shop_id_required_for_roles constraint: %', SQLERRM;
END$$;
