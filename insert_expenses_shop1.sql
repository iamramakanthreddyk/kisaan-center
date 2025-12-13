BEGIN;

INSERT INTO kisaan_expenses (shop_id, user_id, amount, description, status, created_at, updated_at)
VALUES
(1, 3, 500.00, 'Transport', 'pending', now(), now()),
(1, 4, 250.00, 'Packaging', 'pending', now(), now());

COMMIT;

SELECT id, shop_id, user_id, amount, status FROM kisaan_expenses WHERE shop_id = 1;
