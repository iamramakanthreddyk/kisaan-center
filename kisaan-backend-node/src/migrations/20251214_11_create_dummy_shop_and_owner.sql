-- Migration: Create dummy shop and owner user for testing
-- Timestamp: 2025-12-14_11
-- FIXED: Resolves circular dependency by creating owner first, then shop, then linking

DO $$
DECLARE
    owner_rec RECORD;
    shop_rec RECORD;
BEGIN
    -- Step 1: Create owner user WITHOUT shop_id (role 'owner' doesn't require shop_id)
    IF NOT EXISTS (SELECT 1 FROM kisaan_users WHERE username = 'dummy_owner_test') THEN
        INSERT INTO kisaan_users (username, password, role, shop_id, email, contact, balance, status, cumulative_value, created_by, created_at, updated_at)
        VALUES ('dummy_owner_test', '$2a$12$j7l.Q0UHf1o08qPHRUYLMeJxGMmGWhGs3Pw/8PTSY48ovM4ZCsTFq', 'owner', NULL, 'owner@example.com', '0000000000', 0, 'active', 0, 1, now(), now())
        RETURNING id INTO owner_rec;
    ELSE
        SELECT * INTO owner_rec FROM kisaan_users WHERE username = 'dummy_owner_test' LIMIT 1;
    END IF;

    -- Step 2: Create shop with the owner_id
    IF NOT EXISTS (SELECT 1 FROM kisaan_shops WHERE name = 'dummy_shop_for_owner_test') THEN
        INSERT INTO kisaan_shops (name, owner_id, status, created_at, updated_at)
        VALUES ('dummy_shop_for_owner_test', owner_rec.id, 'active', now(), now())
        RETURNING id INTO shop_rec;
    ELSE
        SELECT id INTO shop_rec FROM kisaan_shops WHERE name = 'dummy_shop_for_owner_test' LIMIT 1;
    END IF;

    -- Step 3: Link the owner to the shop
    UPDATE kisaan_users 
    SET shop_id = shop_rec.id 
    WHERE id = owner_rec.id AND shop_id IS NULL;

    RAISE NOTICE 'Successfully created owner (id: %) and shop (id: %)', owner_rec.id, shop_rec.id;
END$$;
