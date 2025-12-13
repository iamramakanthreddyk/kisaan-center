-- KisaanCenter SQLite Seed Data
-- Insert core categories
INSERT OR IGNORE INTO kisaan_categories (name, description) VALUES ('Fruits', 'Fruits category');
INSERT OR IGNORE INTO kisaan_categories (name, description) VALUES ('Vegetables', 'Vegetables category');
INSERT OR IGNORE INTO kisaan_categories (name, description) VALUES ('Flowers', 'Flowers category');
INSERT OR IGNORE INTO kisaan_categories (name, description) VALUES ('Grains', 'Grains category');

-- Insert plans
INSERT OR IGNORE INTO kisaan_plans (name, description, features, is_active) VALUES ('Basic', 'Entry plan', '[]', 1);
INSERT OR IGNORE INTO kisaan_plans (name, description, features, is_active) VALUES ('Standard', 'Standard growth plan', '[]', 1);
INSERT OR IGNORE INTO kisaan_plans (name, description, features, is_active) VALUES ('Premium', 'Full scale plan', '[]', 1);

INSERT OR IGNORE INTO kisaan_users (username, password, role, status, balance, cumulative_value) VALUES ('superadmin', '$2b$10$KCijCY0aEEP9stUB7BgH7.d7pxLjPRMurnBIV5HSZCHO6xbSVw7l.', 'superadmin', 'active', 0.00, 0.00);
INSERT OR IGNORE INTO kisaan_users (username, password, role, status, balance, cumulative_value) VALUES ('dmr_owner', '$2b$10$KCijCY0aEEP9stUB7BgH7.d7pxLjPRMurnBIV5HSZCHO6xbSVw7l.', 'owner', 'active', 0.00, 0.00);
INSERT OR IGNORE INTO kisaan_users (username, password, role, status, balance, cumulative_value) VALUES ('dmr_owner', '$2b$10$wQn6QwQn6QwQn6QwQn6QOeQwQn6QwQn6QwQn6QwQn6QwQn6QwQn6', 'owner', 'active', 0.00, 0.00);
INSERT OR IGNORE INTO kisaan_shops (name, owner_id, plan_id, status) VALUES ('Demo Shop', 2, 1, 'active');

-- Insert a few products for each category
INSERT OR IGNORE INTO kisaan_products (name, category_id, description, unit, record_status) VALUES ('Apple', 1, 'Apple', 'kg', 'active');
INSERT OR IGNORE INTO kisaan_products (name, category_id, description, unit, record_status) VALUES ('Banana', 1, 'Banana', 'kg', 'active');
INSERT OR IGNORE INTO kisaan_products (name, category_id, description, unit, record_status) VALUES ('Tomato', 2, 'Tomato', 'kg', 'active');
INSERT OR IGNORE INTO kisaan_products (name, category_id, description, unit, record_status) VALUES ('Rose', 3, 'Rose', 'kg', 'active');
INSERT OR IGNORE INTO kisaan_products (name, category_id, description, unit, record_status) VALUES ('Wheat', 4, 'Wheat', 'kg', 'active');

-- You can add more seed data as needed for local development.
