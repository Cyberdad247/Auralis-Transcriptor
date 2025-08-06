import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TranscriptionService } from '../../src/services/transcriptionService.js';
import fs from 'fs';
import path from 'path';

// Mock external dependencies
jest.mock('openai');
jest.mock('fs');
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TranscriptionService', () => {
  let transcriptionService;
  let mockOpenAI;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock OpenAI
    mockOpenAI = {
      audio: {
        transcriptions: {
          create: jest.fn()
        }
      }
    };

    // Mock fs methods
    fs.readFileSync = jest.fn();
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.unlinkSync = jest.fn();

    transcriptionService = new TranscriptionService();
    transcriptionService.openai = mockOpenAI;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('transcribe', () => {
    test('should transcribe audio file successfully with OpenAI Whisper', async () => {
      const mockFilePath = '/path/to/audio.mp3';
      const mockFileBuffer = Buffer.from('mock-audio-data');
      const mockTranscriptionResult = {
        text: 'This is a test transcription',
        duration: 10.5
      };

      fs.readFileSync.mockReturnValue(mockFileBuffer);
      mockOpenAI.audio.transcriptions.create.mockResolvedValue(mockTranscriptionResult);

      const result = await transcriptionService.transcribe(mockFilePath, {
        provider: 'openai-whisper',
        language: 'en'
      });

      expect(result).toEqual({
        text: 'This is a test transcription',
        duration: 10.5,
        confidence: expect.any(Number),
        provider: 'openai-whisper'
      });

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(Object),
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json'
      });
    });

    test('should handle transcription errors gracefully', async () => {
      const mockFilePath = '/path/to/audio.mp3';
      const mockFileBuffer = Buffer.from('mock-audio-data');

      fs.readFileSync.mockReturnValue(mockFileBuffer);
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(new Error('API Error'));

      await expect(transcriptionService.transcribe(mockFilePath, {
        provider: 'openai-whisper'
      })).rejects.toThrow('Transcription failed: API Error');
    });

    test('should handle missing file error', async () => {
      const mockFilePath = '/path/to/nonexistent.mp3';

      fs.existsSync.mockReturnValue(false);

      await expect(transcriptionService.transcribe(mockFilePath, {
        provider: 'openai-whisper'
      })).rejects.toThrow('File not found');
    });

    test('should support different audio formats', async () => {
      const testFormats = ['.mp3', '.wav', '.m4a', '.flac'];
      
      for (const format of testFormats) {
        const mockFilePath = `/path/to/audio${format}`;
        const mockFileBuffer = Buffer.from('mock-audio-data');
        const mockTranscriptionResult = {
          text: `Test transcription for ${format}`,
          duration: 5.0
        };

        fs.readFileSync.mockReturnValue(mockFileBuffer);
        mockOpenAI.audio.transcriptions.create.mockResolvedValue(mockTranscriptionResult);

        const result = await transcriptionService.transcribe(mockFilePath, {
          provider: 'openai-whisper'
        });

        expect(result.text).toBe(`Test transcription for ${format}`);
      }
    });

    test('should handle large file processing', async () => {
      const mockFilePath = '/path/to/large-audio.mp3';
      const mockLargeFileBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const mockTranscriptionResult = {
        text: 'This is a long transcription from a large file',
        duration: 3600 // 1 hour
      };

      fs.readFileSync.mockReturnValue(mockLargeFileBuffer);
      mockOpenAI.audio.transcriptions.create.mockResolvedValue(mockTranscriptionResult);

      const result = await transcriptionService.transcribe(mockFilePath, {
        provider: 'openai-whisper',
        chunkSize: 25 * 1024 * 1024 // 25MB chunks
      });

      expect(result.text).toBe('This is a long transcription from a large file');
      expect(result.duration).toBe(3600);
    });
  });

  describe('validateAudioFile', () => {
    test('should validate supported audio formats', () => {
      const supportedFormats = [
        'audio.mp3',
        'audio.wav',
        'audio.m4a',
        'audio.flac',
        'audio.ogg'
      ];

      for (const filename of supportedFormats) {
        expect(transcriptionService.validateAudioFile(filename)).toBe(true);
      }
    });

    test('should reject unsupported formats', () => {
      const unsupportedFormats = [
        'document.pdf',
        'image.jpg',
        'video.mp4',
        'text.txt'
      ];

      for (const filename of unsupportedFormats) {
        expect(transcriptionService.validateAudioFile(filename)).toBe(false);
      }
    });

    test('should handle files without extensions', () => {
      expect(transcriptionService.validateAudioFile('audiofile')).toBe(false);
    });
  });

  describe('getTranscriptionStatus', () => {
    test('should return processing status for ongoing transcription', () => {
      const jobId = 'test-job-123';
      transcriptionService.activeJobs.set(jobId, {
        status: 'processing',
        progress: 50,
        startTime: Date.now()
      });

      const status = transcriptionService.getTranscriptionStatus(jobId);

      expect(status).toEqual({
        status: 'processing',
        progress: 50,
        startTime: expect.any(Number)
      });
    });

    test('should return not found for unknown job', () => {
      const status = transcriptionService.getTranscriptionStatus('unknown-job');

      expect(status).toEqual({
        status: 'not_found',
        error: 'Job not found'
      });
    });
  });

  describe('cancelTranscription', () => {
    test('should cancel ongoing transcription', () => {
      const jobId = 'test-job-123';
      transcriptionService.activeJobs.set(jobId, {
        status: 'processing',
        progress: 30,
        startTime: Date.now()
      });

      const result = transcriptionService.cancelTranscription(jobId);

      expect(result).toBe(true);
      expect(transcriptionService.activeJobs.has(jobId)).toBe(false);
    });

    test('should return false for non-existent job', () => {
      const result = transcriptionService.cancelTranscription('unknown-job');

      expect(result).toBe(false);
    });
  });

  describe('getEstimatedDuration', () => {
    test('should estimate transcription duration based on file size', () => {
      const fileSizes = [
        { size: 1024 * 1024, expected: 'less than 1 minute' }, // 1MB
        { size: 10 * 1024 * 1024, expected: '2-3 minutes' }, // 10MB
        { size: 50 * 1024 * 1024, expected: '5-10 minutes' } // 50MB
      ];

      for (const { size, expected } of fileSizes) {
        const estimate = transcriptionService.getEstimatedDuration(size);
        expect(typeof estimate).toBe('string');
        expect(estimate.length).toBeGreaterThan(0);
      }
    });
  });

  describe('cleanup', () => {
    test('should clean up temporary files', async () => {
      const tempFiles = [
        '/tmp/audio1.mp3',
        '/tmp/audio2.wav',
        '/tmp/processed_audio.m4a'
      ];

      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {});

      await transcriptionService.cleanup(tempFiles);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(tempFiles.length);
      for (const file of tempFiles) {
        expect(fs.unlinkSync).toHaveBeenCalledWith(file);
      }
    });

    test('should handle cleanup errors gracefully', async () => {
      const tempFiles = ['/tmp/audio1.mp3'];

      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw error
      await expect(transcriptionService.cleanup(tempFiles)).resolves.not.toThrow();
    });
  });
});

