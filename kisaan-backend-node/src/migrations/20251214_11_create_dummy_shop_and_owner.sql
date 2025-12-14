-- Migration: Create dummy shop and owner user for testing
-- Timestamp: 2025-12-14_11

-- Insert a dummy shop if not exists
DO $$
DECLARE
    shop_rec RECORD;
BEGIN
    SELECT * INTO shop_rec FROM kisaan_shops WHERE name = 'dummy_shop_for_owner_test' LIMIT 1;
    IF NOT FOUND THEN
        INSERT INTO kisaan_shops (name, owner_id, status, created_at, updated_at)
        VALUES ('dummy_shop_for_owner_test', NULL, 'active', now(), now())
        RETURNING id INTO shop_rec;
    END IF;

    -- Insert an owner user linked to the shop if not exists
    IF NOT EXISTS (SELECT 1 FROM kisaan_users WHERE username = 'dummy_owner_test') THEN
        -- IMPORTANT: Replace the password hash below with a real hash from your password manager.
        INSERT INTO kisaan_users (username, password, role, shop_id, email, contact, balance, status, cumulative_value, created_by, created_at, updated_at)
        VALUES ('dummy_owner_test', '$2a$12$j7l.Q0UHf1o08qPHRUYLMeJxGMmGWhGs3Pw/8PTSY48ovM4ZCsTFq', 'owner', shop_rec.id, 'owner@example.com', '0000000000', 0, 'active', 0, 1, now(), now());
    END IF;
END$$;
