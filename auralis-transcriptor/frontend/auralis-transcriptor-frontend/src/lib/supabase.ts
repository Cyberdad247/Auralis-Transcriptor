import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gwovgwvcaqgjubrykjun.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b3Znd3ZjYXFnanVicnlranVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjYyMDYsImV4cCI6MjA2OTk0MjIwNn0.wmp4EGi2c_XoXKBVnh8yEpoomRKoj8CFX-GPAJksYYQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transcriptions: {
        Row: {
          id: string
          user_id: string
          original_filename: string
          file_type: string | null
          file_size: number | null
          original_file_url: string | null
          processed_audio_url: string | null
          transcript_text: string | null
          status: 'UPLOADED' | 'PROCESSING_AUDIO' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'
          duration_seconds: number | null
          processing_started_at: string | null
          processing_completed_at: string | null
          error_message: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_filename: string
          file_type?: string | null
          file_size?: number | null
          original_file_url?: string | null
          processed_audio_url?: string | null
          transcript_text?: string | null
          status?: 'UPLOADED' | 'PROCESSING_AUDIO' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'
          duration_seconds?: number | null
          processing_started_at?: string | null
          processing_completed_at?: string | null
          error_message?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_filename?: string
          file_type?: string | null
          file_size?: number | null
          original_file_url?: string | null
          processed_audio_url?: string | null
          transcript_text?: string | null
          status?: 'UPLOADED' | 'PROCESSING_AUDIO' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'
          duration_seconds?: number | null
          processing_started_at?: string | null
          processing_completed_at?: string | null
          error_message?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      transcription_status: 'UPLOADED' | 'PROCESSING_AUDIO' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'
    }
  }
}
