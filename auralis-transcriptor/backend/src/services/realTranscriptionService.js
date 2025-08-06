import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';
import openai from 'openai';
import { aiProviderService } from './aiProviderService.js';

export class RealTranscriptionService {
  constructor() {
    this.openaiClient = null;
    this.pythonServiceUrl = config.pythonService?.url || 'http://localhost:8000';
    this.initializeClients();
  }

  initializeClients() {
    try {
      // Initialize OpenAI client
      if (process.env.OPENAI_API_KEY) {
        this.openaiClient = new openai.OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        logger.info('OpenAI client initialized for transcription');
      }
    } catch (error) {
      logger.error('Failed to initialize transcription clients:', error);
    }
  }

  async transcribeAudio(audioPath, options = {}) {
    const {
      provider = config.transcription.provider || 'openai-whisper',
      language = config.transcription.language || 'en',
      enableSpeakerDetection = config.transcription.enableSpeakerDetection,
      enableNoiseReduction = true
    } = options;

    try {
      logger.info('Starting real transcription', { 
        provider, 
        language, 
        audioPath: audioPath.split('/').pop() 
      });

      let result;

      switch (provider) {
        case 'deepseek':
          result = await aiProviderService.transcribeWithDeepseek(audioPath, language);
          break;
        case 'gemini':
          result = await aiProviderService.transcribeWithGemini(audioPath, language);
          break;
        case 'openai-whisper':
          result = await this.transcribeWithOpenAI(audioPath, language);
          break;
        case 'python-service':
          result = await this.transcribeWithPythonService(audioPath, {
            provider: 'openai-whisper',
            language,
            enableSpeakerDetection,
            enableNoiseReduction
          });
          break;
        case 'google-speech':
          result = await this.transcribeWithPythonService(audioPath, {
            provider: 'google-speech',
            language,
            enableSpeakerDetection,
            enableNoiseReduction
          });
          break;
        default:
          throw new Error(`Unsupported transcription provider: ${provider}`);
      }

      logger.info('Transcription completed successfully', {
        provider,
        textLength: result.text.length,
        confidence: result.confidence,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('Real transcription failed', { 
        provider, 
        error: error.message,
        audioPath: audioPath.split('/').pop()
      });
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async transcribeWithOpenAI(audioPath, language) {
    try {
      if (!this.openaiClient) {
        throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY');
      }

      const audioFile = await fs.readFile(audioPath);
      const file = new File([audioFile], 'audio.wav', { type: 'audio/wav' });

      const response = await this.openaiClient.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: language !== 'auto' ? language : undefined,
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
      });

      return {
        text: response.text,
        confidence: 0.9, // OpenAI doesn't provide confidence scores
        language: response.language || language,
        duration: response.duration || 0,
        words: response.words || [],
        metadata: {
          provider: 'openai-whisper',
          model: 'whisper-1',
          originalLanguage: response.language
        }
      };

    } catch (error) {
      logger.error('OpenAI Whisper transcription failed:', error);
      throw new Error(`OpenAI transcription failed: ${error.message}`);
    }
  }

  async transcribeWithPythonService(audioPath, options = {}) {
    try {
      // Check if Python service is available
      const healthCheck = await this.checkPythonServiceHealth();
      if (!healthCheck.healthy) {
        throw new Error('Python audio service is not available');
      }

      // Prepare form data
      const formData = new FormData();
      const audioBuffer = await fs.readFile(audioPath);
      formData.append('file', audioBuffer, 'audio.wav');
      formData.append('provider', options.provider || 'openai-whisper');
      formData.append('language', options.language || 'en');
      formData.append('enable_speaker_detection', options.enableSpeakerDetection || false);
      formData.append('enable_noise_reduction', options.enableNoiseReduction || true);

      // Send request to Python service
      const response = await axios.post(
        `${this.pythonServiceUrl}/transcribe`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: config.transcription.timeout || 300000 // 5 minutes
        }
      );

      const result = response.data;

      return {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        duration: result.duration,
        speakerSegments: result.speaker_segments || [],
        metadata: {
          ...result.metadata,
          pythonServiceUsed: true
        }
      };

    } catch (error) {
      logger.error('Python service transcription failed:', error);
      
      // If Python service fails, fallback to direct OpenAI
      if (options.provider === 'openai-whisper' && this.openaiClient) {
        logger.info('Falling back to direct OpenAI transcription');
        return await this.transcribeWithOpenAI(audioPath, options.language);
      }
      
      throw new Error(`Python service transcription failed: ${error.message}`);
    }
  }

  async enhanceAudio(audioPath) {
    try {
      const healthCheck = await this.checkPythonServiceHealth();
      if (!healthCheck.healthy) {
        logger.warn('Python service not available for audio enhancement');
        return audioPath; // Return original if enhancement service unavailable
      }

      const formData = new FormData();
      const audioBuffer = await fs.readFile(audioPath);
      formData.append('file', audioBuffer, 'audio.wav');

      const response = await axios.post(
        `${this.pythonServiceUrl}/audio/enhance`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 60000 // 1 minute timeout for enhancement
        }
      );

      // Save enhanced audio to temporary file
      const enhancedPath = audioPath.replace('.wav', '_enhanced.wav');
      await fs.writeFile(enhancedPath, response.data);

      logger.info('Audio enhancement completed', { 
        originalPath: audioPath.split('/').pop(),
        enhancedPath: enhancedPath.split('/').pop()
      });

      return enhancedPath;

    } catch (error) {
      logger.warn('Audio enhancement failed, using original audio:', error.message);
      return audioPath; // Return original audio if enhancement fails
    }
  }

  async analyzeAudio(audioPath) {
    try {
      const healthCheck = await this.checkPythonServiceHealth();
      if (!healthCheck.healthy) {
        logger.warn('Python service not available for audio analysis');
        return null;
      }

      const formData = new FormData();
      const audioBuffer = await fs.readFile(audioPath);
      formData.append('file', audioBuffer, 'audio.wav');

      const response = await axios.post(
        `${this.pythonServiceUrl}/audio/analyze`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000 // 30 seconds for analysis
        }
      );

      logger.info('Audio analysis completed', { 
        audioPath: audioPath.split('/').pop(),
        duration: response.data.duration,
        format: response.data.format
      });

      return response.data;

    } catch (error) {
      logger.warn('Audio analysis failed:', error.message);
      return null;
    }
  }

  async generateTTS(text, options = {}) {
    try {
      const healthCheck = await this.checkPythonServiceHealth();
      if (!healthCheck.healthy) {
        throw new Error('Python service not available for TTS');
      }

      const response = await axios.post(
        `${this.pythonServiceUrl}/tts`,
        {
          text,
          voice: options.voice || 'en',
          provider: options.provider || 'gtts'
        },
        {
          responseType: 'arraybuffer',
          timeout: 60000 // 1 minute for TTS
        }
      );

      // Save TTS audio to temporary file
      const outputPath = `${config.upload.tempDir}/tts_${Date.now()}.mp3`;
      await fs.writeFile(outputPath, response.data);

      logger.info('TTS generation completed', { 
        textLength: text.length,
        outputPath: outputPath.split('/').pop()
      });

      return outputPath;

    } catch (error) {
      logger.error('TTS generation failed:', error);
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  async checkPythonServiceHealth() {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/health`, {
        timeout: 5000 // 5 seconds timeout
      });
      
      return {
        healthy: response.status === 200,
        services: response.data.services || {}
      };
    } catch (error) {
      logger.warn('Python service health check failed:', error.message);
      return { healthy: false, error: error.message };
    }
  }

  // Mock transcription for development/testing
  async mockTranscription(audioPath, filename) {
    const mockTexts = [
      "Welcome to the Auralis Transcriptor system. This is a demonstration of the advanced speech-to-text capabilities built into our Star Trek LCARS-themed interface.",
      "Captain's log, stardate 47988.1. We have successfully implemented a comprehensive transcription system that can handle multiple audio and video formats with high accuracy.",
      "Computer, analyze the linguistic patterns in the uploaded audio file and provide a detailed transcription with speaker identification and temporal markers.",
      "The Enterprise's universal translator has been enhanced with modern machine learning algorithms to provide real-time audio transcription services."
    ];

    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      text: randomText,
      confidence: 0.95,
      language: 'en',
      duration: 15.5,
      metadata: {
        provider: 'mock-transcription',
        filename,
        processingTime: '2.1s'
      }
    };
  }
}

// Export singleton instance
export const realTranscriptionService = new RealTranscriptionService();
