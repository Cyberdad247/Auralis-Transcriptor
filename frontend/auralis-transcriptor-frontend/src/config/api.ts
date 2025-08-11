export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiPath = (path: string) => {
  if (!path.startsWith('/')) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
};

