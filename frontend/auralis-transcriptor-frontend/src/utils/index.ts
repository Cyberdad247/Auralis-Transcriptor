export const createPageUrl = (page: string): string => {
  const routes: Record<string, string> = {
    Upload: '/',
    Transcriptions: '/transcriptions',
    Login: '/login',
    Register: '/register',
  };
  return routes[page] || '/';
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '--';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const validateFile = (file: File): void => {
  const maxSize = 500 * 1024 * 1024; // 500MB
  const allowedTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/m4a',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
  ];

  if (file.size > maxSize) {
    throw new Error(`File size exceeds 500MB limit. Current size: ${formatFileSize(file.size)}`);
  }

  const isValidType = allowedTypes.some(type => {
    const extension = type.split('/')[1];
    return file.type.includes(extension) || file.name.toLowerCase().includes(`.${extension}`);
  });

  if (!isValidType) {
    throw new Error(`Unsupported file format: ${file.type}. Please use MP3, WAV, FLAC, M4A, MP4, MOV, or AVI files.`);
  }
};