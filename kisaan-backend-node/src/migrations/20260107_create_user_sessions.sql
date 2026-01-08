-- Migration: Create user sessions table for session management
-- Date: 20260107
-- Description: Adds table to track user login sessions with JTI for token invalidation

CREATE TABLE IF NOT EXISTS kisaan_user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES kisaan_users(id) ON DELETE CASCADE,
    jti VARCHAR(255) NOT NULL UNIQUE,
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON kisaan_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON kisaan_user_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON kisaan_user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON kisaan_user_sessions(is_active);

-- Add comment
COMMENT ON TABLE kisaan_user_sessions IS 'Tracks user login sessions for multi-session control and token invalidation';