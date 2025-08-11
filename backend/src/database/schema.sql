-- Auralis Transcriptor Database Schema
-- Star Trek LCARS-themed Transcription System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE transcription_status AS ENUM (
    'UPLOADED', 
    'PROCESSING_AUDIO', 
    'TRANSCRIBING', 
    'COMPLETED', 
    'FAILED'
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    original_file_url TEXT,
    processed_audio_url TEXT,
    transcript_text TEXT,
    status transcription_status NOT NULL DEFAULT 'UPLOADED',
    duration_seconds INTEGER,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for transcriptions
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_status ON transcriptions(user_id, status);

-- Refresh tokens table (for JWT refresh functionality)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- System logs table (for audit trail)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for system logs
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at 
    BEFORE UPDATE ON transcriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for user statistics
CREATE OR REPLACE VIEW user_transcription_stats AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(t.id) as total_transcriptions,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_transcriptions,
    COUNT(CASE WHEN t.status = 'FAILED' THEN 1 END) as failed_transcriptions,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN t.duration_seconds ELSE 0 END) as total_duration_seconds,
    SUM(t.file_size) as total_file_size_bytes,
    MAX(t.created_at) as last_transcription_date
FROM users u
LEFT JOIN transcriptions t ON u.id = t.user_id
GROUP BY u.id, u.email;

-- Sample data for development (commented out - uncomment if needed)
/*
-- Insert a test user
INSERT INTO users (email, password_hash, first_name, last_name) 
VALUES ('test@auralis.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5w5F5F5F5F', 'Jean-Luc', 'Picard')
ON CONFLICT (email) DO NOTHING;

-- Insert a test transcription
INSERT INTO transcriptions (
    user_id, 
    original_filename, 
    file_type, 
    file_size, 
    status,
    transcript_text,
    duration_seconds
) 
SELECT 
    u.id, 
    'bridge_recording_001.mp3', 
    'audio/mpeg', 
    5242880, 
    'COMPLETED',
    'Captain''s log, Stardate 47988.1. The Enterprise is conducting a routine survey of the Briar Patch when we encountered an unusual energy signature.',
    180
FROM users u 
WHERE u.email = 'test@auralis.com'
ON CONFLICT DO NOTHING;
*/
