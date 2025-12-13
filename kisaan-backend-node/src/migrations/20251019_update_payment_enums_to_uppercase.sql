-- Migration: Update payment enums to uppercase
-- Date: 2025-10-19
-- Description: Add missing payment enum values to match code constants

-- Add missing payer_type enum values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_payer_type') AND enumlabel = 'FARMER') THEN
    ALTER TYPE enum_kisaan_payments_payer_type ADD VALUE 'FARMER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_payer_type') AND enumlabel = 'EXTERNAL') THEN
    ALTER TYPE enum_kisaan_payments_payer_type ADD VALUE 'EXTERNAL';
  END IF;
END $$;

-- Add missing payee_type enum values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_payee_type') AND enumlabel = 'BUYER') THEN
    ALTER TYPE enum_kisaan_payments_payee_type ADD VALUE 'BUYER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_payee_type') AND enumlabel = 'EXTERNAL') THEN
    ALTER TYPE enum_kisaan_payments_payee_type ADD VALUE 'EXTERNAL';
  END IF;
END $$;

-- Add missing method enum values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_method') AND enumlabel = 'BANK_TRANSFER') THEN
    ALTER TYPE enum_kisaan_payments_method ADD VALUE 'BANK_TRANSFER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_method') AND enumlabel = 'CARD') THEN
    ALTER TYPE enum_kisaan_payments_method ADD VALUE 'CARD';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_kisaan_payments_method') AND enumlabel = 'CHEQUE') THEN
    ALTER TYPE enum_kisaan_payments_method ADD VALUE 'CHEQUE';
  END IF;
END $$;