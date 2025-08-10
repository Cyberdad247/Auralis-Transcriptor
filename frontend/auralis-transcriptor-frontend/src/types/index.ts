export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Transcription {
  id: string;
  user_id: string;
  original_filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  duration_seconds?: number;
  status: 'UPLOADED' | 'PROCESSING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
  transcript_text?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UploadResponse {
  transcription: Transcription;
}

export interface ApiError {
  message: string;
  status?: number;
}