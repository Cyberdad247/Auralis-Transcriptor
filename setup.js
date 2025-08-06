import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log output during tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = ':memory:';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock external services
jest.mock('../src/services/transcriptionService.js', () => ({
  TranscriptionService: {
    transcribe: jest.fn().mockResolvedValue({
      id: 'test-transcript-id',
      text: 'Test transcription result',
      confidence: 0.95,
      duration: 10.5
    })
  }
}));

jest.mock('../src/services/ttsService.js', () => ({
  TTSService: {
    synthesize: jest.fn().mockResolvedValue({
      audioBuffer: Buffer.from('mock-audio-data'),
      format: 'mp3'
    })
  }
}));

// Global test utilities
global.testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser'
};

global.testTranscript = {
  id: 'test-transcript-id',
  userId: 'test-user-id',
  filename: 'test-audio.mp3',
  text: 'Test transcription content',
  status: 'completed',
  createdAt: new Date().toISOString()
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
