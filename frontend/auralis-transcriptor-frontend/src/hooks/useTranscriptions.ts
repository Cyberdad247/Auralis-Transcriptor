import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transcriptionAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'

// Hook for getting transcriptions list
export const useTranscriptions = (page = 1, limit = 20, status?: string) => {
  return useQuery({
    queryKey: ['transcriptions', page, limit, status],
    queryFn: () => transcriptionAPI.getTranscriptions(page, limit, status),
    retry: 1,
    refetchOnWindowFocus: false
  })
}

// Hook for getting a specific transcription
export const useTranscription = (id: string) => {
  const queryClient = useQueryClient()
  
  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = transcriptionAPI.subscribeToTranscription(id, (payload) => {
      // Update the cache when transcription status changes
      queryClient.setQueryData(['transcription', id], payload.new)
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [id, queryClient])

  return useQuery({
    queryKey: ['transcription', id],
    queryFn: () => transcriptionAPI.getTranscription(id),
    retry: 1,
    refetchOnWindowFocus: false
  })
}

// Hook for uploading audio
export const useUploadAudio = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: transcriptionAPI.uploadAudio,
    onSuccess: () => {
      // Invalidate transcriptions list to show new upload
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
    },
    onError: (error: any) => {
      console.error('Upload failed:', error)
    }
  })
}

// Hook for starting transcription
export const useStartTranscription = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: transcriptionAPI.startTranscription,
    onSuccess: (data, transcriptionId) => {
      // Update the specific transcription in cache
      queryClient.setQueryData(['transcription', transcriptionId], data)
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
    },
    onError: (error: any) => {
      console.error('Transcription start failed:', error)
    }
  })
}

// Hook for deleting transcription
export const useDeleteTranscription = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: transcriptionAPI.deleteTranscription,
    onSuccess: () => {
      // Invalidate transcriptions list to remove deleted item
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
    },
    onError: (error: any) => {
      console.error('Delete failed:', error)
    }
  })
}
