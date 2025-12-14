-- Idempotent migration: create kisaan_features, kisaan_plan_features, kisaan_user_feature_overrides
BEGIN;

CREATE SEQUENCE IF NOT EXISTS kisaan_features_id_seq START 1;

CREATE TABLE IF NOT EXISTS kisaan_features (
  id INTEGER DEFAULT nextval('kisaan_features_id_seq') PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(60),
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kisaan_plan_features (
  plan_id INTEGER NOT NULL,
  feature_code VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, feature_code)
);

CREATE TABLE IF NOT EXISTS kisaan_user_feature_overrides (
  user_id BIGINT NOT NULL,
  feature_code VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, feature_code)
);

COMMIT;
