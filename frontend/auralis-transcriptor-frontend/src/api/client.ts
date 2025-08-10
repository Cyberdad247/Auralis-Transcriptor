import axios from 'axios';
import type { AuthResponse, Transcription, UploadResponse } from '../types';
import { API_BASE_URL } from '../config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', { email, password });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Transcriptions API
export const transcriptionsAPI = {
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/transcriptions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (): Promise<Transcription[]> => {
    const response = await apiClient.get('/transcriptions');
    return response.data;
  },

  get: async (id: string): Promise<Transcription> => {
    const response = await apiClient.get(`/transcriptions/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transcriptions/${id}`);
  },

  downloadTxt: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/transcriptions/${id}/download/txt`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadMd: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/transcriptions/${id}/download/md`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default apiClient;