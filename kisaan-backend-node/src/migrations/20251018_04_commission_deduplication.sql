-- Migration: Remove duplicate commission records (based on shop_id and rate)
DELETE FROM kisaan_commissions c1 USING kisaan_commissions c2
WHERE c1.id > c2.id AND c1.shop_id = c2.shop_id AND c1.rate = c2.rate AND c1.type = c2.type;
