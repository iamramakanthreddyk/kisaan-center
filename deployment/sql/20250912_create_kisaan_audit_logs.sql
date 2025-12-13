-- Migration: Create kisaan_audit_logs table for audit logging
CREATE TABLE IF NOT EXISTS public.kisaan_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT REFERENCES kisaan_shops(id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES kisaan_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditlogs_shop_id ON public.kisaan_audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_user_id ON public.kisaan_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_entity_type ON public.kisaan_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_auditlogs_created_at ON public.kisaan_audit_logs(created_at);

-- This table is required for audit logging in transaction, payment, and commission services.
-- It stores a record of important actions and changes for traceability and compliance.


SELECT tablename FROM pg_tables WHERE tablename = 'kisaan_audit_logs' AND schemaname = 'public';