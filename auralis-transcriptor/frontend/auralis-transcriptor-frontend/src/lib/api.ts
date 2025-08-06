import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

// Transcription API using Supabase Edge Functions
export const transcriptionAPI = {
  // Upload audio file and create transcription record
  uploadAudio: async (file: File) => {
    const fileReader = new FileReader()
    return new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const base64Data = fileReader.result as string
          const { data, error } = await supabase.functions.invoke('audio-upload', {
            body: {
              audioData: base64Data,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            }
          })

          if (error) throw error
          resolve(data)
        } catch (err) {
          reject(err)
        }
      }
      fileReader.onerror = reject
      fileReader.readAsDataURL(file)
    })
  },

  // Start transcription process
  startTranscription: async (transcriptionId: string) => {
    const { data, error } = await supabase.functions.invoke('start-transcription', {
      body: { transcriptionId }
    })

    if (error) throw error
    return data
  },

  // Get user's transcriptions
  getTranscriptions: async (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    
    if (status) {
      params.append('status', status)
    }

    const { data, error } = await supabase.functions.invoke('get-transcriptions?' + params.toString())

    if (error) throw error
    return data
  },

  // Get transcription by ID (using direct database query)
  getTranscription: async (id: string) => {
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  },

  // Delete transcription
  deleteTranscription: async (id: string) => {
    const { error } = await supabase
      .from('transcriptions')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Subscribe to transcription status changes
  subscribeToTranscription: (transcriptionId: string, callback: (payload: any) => void) => {
    return supabase
      .channel('transcription-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcriptions',
          filter: `id=eq.${transcriptionId}`
        },
        callback
      )
      .subscribe()
  }
}

// Auth helpers
export const authAPI = {
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    return user
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Sign up with email and password
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}
