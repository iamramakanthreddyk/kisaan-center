-- Migration: Ensure core product & assignment tables exist with required constraints
-- Safe / idempotent (CREATE IF NOT EXISTS + conditional constraint adds)
-- Date: 2025-09-25

-- 1. Central products catalog (subset may already exist; keep columns aligned with model definition)
CREATE TABLE IF NOT EXISTS kisaan_products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id BIGINT NOT NULL REFERENCES kisaan_categories(id),
    description TEXT NULL,
    unit VARCHAR(32) NULL,
    record_status VARCHAR(20) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique name per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_category ON kisaan_products(name, category_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON kisaan_products(category_id);

-- 2. Shop -> Product enablement subset
CREATE TABLE IF NOT EXISTS kisaan_shop_products (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES kisaan_shops(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES kisaan_products(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique (shop, product)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_shop_products_shop_product'
    ) THEN
        ALTER TABLE kisaan_shop_products ADD CONSTRAINT uq_shop_products_shop_product UNIQUE (shop_id, product_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shop_products_shop ON kisaan_shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_product ON kisaan_shop_products(product_id);

-- 3. Farmer product assignments (farmer-level subset; supports default product)
CREATE TABLE IF NOT EXISTS farmer_product_assignments (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES kisaan_users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES kisaan_products(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate assignment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_farmer_product_unique'
    ) THEN
        ALTER TABLE farmer_product_assignments ADD CONSTRAINT uq_farmer_product_unique UNIQUE (farmer_id, product_id);
    END IF;
END $$;

-- Index for farmer lookups
CREATE INDEX IF NOT EXISTS idx_farmer_product_farmer ON farmer_product_assignments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_product_product ON farmer_product_assignments(product_id);

-- Partial index enforcing fast lookup of default
CREATE INDEX IF NOT EXISTS idx_farmer_product_default ON farmer_product_assignments(farmer_id) WHERE is_default = TRUE;

-- Data hygiene: ensure at most one default per farmer (convert extras to non-default keeping oldest as default)
WITH ranked AS (
    SELECT id, farmer_id, is_default,
           ROW_NUMBER() OVER (PARTITION BY farmer_id ORDER BY created_at ASC) AS rn
    FROM farmer_product_assignments WHERE is_default = TRUE
), multi AS (
    SELECT farmer_id FROM ranked WHERE rn > 1 GROUP BY farmer_id
)
UPDATE farmer_product_assignments f
SET is_default = FALSE
FROM ranked r
WHERE f.id = r.id AND r.rn > 1 AND r.farmer_id IN (SELECT farmer_id FROM multi);

-- End migration
