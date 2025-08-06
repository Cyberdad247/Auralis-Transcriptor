-- Migration: create_storage_bucket_policy
-- Created at: 1754367318

-- Create storage bucket policy for audio files
-- This allows authenticated users to upload to their own folders

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  false,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/ogg', 'video/mp4', 'video/avi', 'video/mov', 'video/mkv']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for audio files - users can only access their own files
CREATE POLICY "Users can upload their own audio files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" ON storage.objects
FOR UPDATE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" ON storage.objects
FOR DELETE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);;