-- Migration: setup_rls_policies
-- Created at: 1754366916

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for transcriptions table
-- Users can only see their own transcriptions
CREATE POLICY "Users can view own transcriptions" ON transcriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcriptions" ON transcriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcriptions" ON transcriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions" ON transcriptions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for system_logs table
-- Only authenticated users can view logs, but only service role can insert
CREATE POLICY "Authenticated users can view relevant logs" ON system_logs
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can insert logs" ON system_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();;