import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'auralis_transcriptor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    connectionString: process.env.DATABASE_URL || null
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024, // 500MB
    allowedTypes: [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/m4a',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
    ],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './temp'
  },

  // AWS configuration (for when credentials are available)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'auralis-transcriptor-files',
      endpoint: process.env.AWS_S3_ENDPOINT || null
    },
    sqs: {
      queueUrl: process.env.AWS_SQS_QUEUE_URL || null,
      deadLetterQueueUrl: process.env.AWS_SQS_DLQ_URL || null
    },
    transcribe: {
      outputBucket: process.env.AWS_TRANSCRIBE_OUTPUT_BUCKET || 'auralis-transcriptor-transcripts'
    }
  },

  // FFmpeg configuration
  ffmpeg: {
    path: process.env.FFMPEG_PATH || 'ffmpeg',
    timeout: parseInt(process.env.FFMPEG_TIMEOUT) || 300000, // 5 minutes
    outputFormat: 'wav',
    sampleRate: 16000,
    channels: 1
  },

  // AI API configuration
  ai: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || null,
    geminiApiKey: process.env.GEMINI_API_KEY || null
  },

  // Transcription configuration
  transcription: {
    provider: process.env.TRANSCRIPTION_PROVIDER || 'deepseek', // 'deepseek', 'gemini', 'mock', 'enhanced', or 'aws-transcribe'
    language: process.env.TRANSCRIPTION_LANGUAGE || 'en-US',
    timeout: parseInt(process.env.TRANSCRIPTION_TIMEOUT) || 600000, // 10 minutes
    retries: parseInt(process.env.TRANSCRIPTION_RETRIES) || 3,
    enableNLP: process.env.ENABLE_NLP_ANALYSIS === 'true',
    enableSentiment: process.env.ENABLE_SENTIMENT_ANALYSIS === 'true',
    enableSpeakerDetection: process.env.ENABLE_SPEAKER_DETECTION === 'true',
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7
  },

  // Text-to-Speech configuration
  tts: {
    provider: process.env.TTS_PROVIDER || 'system', // 'system', 'google', 'espeak'
    voice: process.env.TTS_VOICE || 'en',
    speed: parseFloat(process.env.TTS_SPEED) || 1.0,
    pitch: parseFloat(process.env.TTS_PITCH) || 1.0,
    volume: parseFloat(process.env.TTS_VOLUME) || 1.0,
    outputFormat: process.env.TTS_OUTPUT_FORMAT || 'mp3',
    cacheEnabled: process.env.TTS_CACHE_ENABLED !== 'false',
    maxCacheSize: parseInt(process.env.TTS_MAX_CACHE_SIZE) || 100 // MB
  },

  // Audio Analysis configuration
  audioAnalysis: {
    enableVAD: process.env.ENABLE_VAD === 'true', // Voice Activity Detection
    enableNoiseReduction: process.env.ENABLE_NOISE_REDUCTION === 'true',
    enablePitchDetection: process.env.ENABLE_PITCH_DETECTION === 'true',
    sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE) || 16000,
    frameSize: parseInt(process.env.AUDIO_FRAME_SIZE) || 512,
    hopLength: parseInt(process.env.AUDIO_HOP_LENGTH) || 256
  },

  // Queue configuration
  queue: {
    type: process.env.QUEUE_TYPE || 'memory', // 'memory' or 'sqs'
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 3,
    pollInterval: parseInt(process.env.QUEUE_POLL_INTERVAL) || 5000 // 5 seconds
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // Python Services configuration
  pythonService: {
    url: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    enabled: process.env.PYTHON_SERVICE_ENABLED !== 'false',
    timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT) || 300000 // 5 minutes
  }
};

// Validate critical configuration
export function validateConfig() {
  const errors = [];

  if (!config.jwt.secret || config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    if (config.nodeEnv === 'production') {
      errors.push('JWT_SECRET must be set in production');
    }
  }

  if (!config.database.connectionString && !config.database.password && config.nodeEnv === 'production') {
    errors.push('Database configuration is incomplete for production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }

  return true;
}
