-- Rename columns in kisaan_shops from camelCase to snake_case
ALTER TABLE public.kisaan_shops RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE public.kisaan_shops RENAME COLUMN "updatedAt" TO updated_at;
