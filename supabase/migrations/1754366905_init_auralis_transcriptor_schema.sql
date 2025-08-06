-- Migration: init_auralis_transcriptor_schema
-- Created at: 1754366905

-- Auralis Transcriptor Database Schema for Supabase
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

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- System logs table (for audit trail)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at 
    BEFORE UPDATE ON transcriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for user statistics
CREATE OR REPLACE VIEW user_transcription_stats AS
SELECT 
    p.id as user_id,
    p.email,
    COUNT(t.id) as total_transcriptions,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_transcriptions,
    COUNT(CASE WHEN t.status = 'FAILED' THEN 1 END) as failed_transcriptions,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN t.duration_seconds ELSE 0 END) as total_duration_seconds,
    SUM(t.file_size) as total_file_size_bytes,
    MAX(t.created_at) as last_transcription_date
FROM profiles p
LEFT JOIN transcriptions t ON p.id = t.user_id
GROUP BY p.id, p.email;;