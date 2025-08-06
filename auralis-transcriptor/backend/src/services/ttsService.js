import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import say from 'say';
import googleTTS from 'google-tts-api';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

export class TTSService {
  constructor() {
    this.cache = new Map();
    this.cacheDir = path.join(config.upload.tempDir, 'tts-cache');
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Load existing cache if enabled
      if (config.tts.cacheEnabled) {
        await this.loadCache();
      }
    } catch (error) {
      logger.error('Failed to initialize TTS cache', { error: error.message });
    }
  }

  async generateSpeech(text, options = {}) {
    try {
      const ttsOptions = {
        provider: options.provider || config.tts.provider,
        voice: options.voice || config.tts.voice,
        speed: options.speed || config.tts.speed,
        pitch: options.pitch || config.tts.pitch,
        volume: options.volume || config.tts.volume,
        format: options.format || config.tts.outputFormat
      };

      logger.info('Generating speech', { 
        textLength: text.length, 
        provider: ttsOptions.provider,
        voice: ttsOptions.voice 
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(text, ttsOptions);
      if (config.tts.cacheEnabled && this.cache.has(cacheKey)) {
        logger.debug('TTS cache hit', { cacheKey });
        return this.cache.get(cacheKey);
      }

      let audioPath;
      switch (ttsOptions.provider) {
        case 'google':
          audioPath = await this.generateWithGoogle(text, ttsOptions);
          break;
        case 'espeak':
          audioPath = await this.generateWithEspeak(text, ttsOptions);
          break;
        case 'system':
        default:
          audioPath = await this.generateWithSystem(text, ttsOptions);
          break;
      }

      // Cache the result
      if (config.tts.cacheEnabled && audioPath) {
        this.cache.set(cacheKey, audioPath);
        await this.saveCacheEntry(cacheKey, audioPath);
      }

      logger.info('Speech generation completed', { 
        audioPath, 
        provider: ttsOptions.provider 
      });

      return audioPath;
    } catch (error) {
      logger.error('Speech generation failed', { 
        textLength: text.length, 
        error: error.message 
      });
      throw error;
    }
  }

  async generateWithGoogle(text, options) {
    try {
      const url = googleTTS.getAudioUrl(text, {
        lang: options.voice || 'en',
        slow: options.speed < 1,
        host: 'https://translate.google.com'
      });

      // Download the audio
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google TTS API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const outputPath = path.join(this.cacheDir, `${uuidv4()}.mp3`);
      
      await fs.writeFile(outputPath, Buffer.from(audioBuffer));
      
      return outputPath;
    } catch (error) {
      logger.error('Google TTS failed', { error: error.message });
      throw new Error(`Google TTS failed: ${error.message}`);
    }
  }

  async generateWithEspeak(text, options) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.cacheDir, `${uuidv4()}.wav`);
      
      const args = [
        '-s', Math.round(options.speed * 175), // Speed in words per minute
        '-p', Math.round(options.pitch * 50), // Pitch (0-99)
        '-a', Math.round(options.volume * 200), // Amplitude (0-200)
        '-v', options.voice || 'en',
        '-w', outputPath, // Write to file
        text
      ];

      const espeak = spawn('espeak', args);

      espeak.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`eSpeak failed with code ${code}`));
        }
      });

      espeak.on('error', (error) => {
        logger.warn('eSpeak not available, falling back to system TTS');
        this.generateWithSystem(text, options).then(resolve).catch(reject);
      });
    });
  }

  async generateWithSystem(text, options) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.cacheDir, `${uuidv4()}.wav`);
      
      // Use node-say library for system TTS
      say.export(text, options.voice, options.speed, outputPath, (err) => {
        if (err) {
          logger.error('System TTS failed', { error: err.message });
          reject(new Error(`System TTS failed: ${err.message}`));
        } else {
          resolve(outputPath);
        }
      });
    });
  }

  async generateBatch(textSegments, options = {}) {
    try {
      logger.info('Generating batch speech', { segments: textSegments.length });

      const results = [];
      
      for (let i = 0; i < textSegments.length; i++) {
        const segment = textSegments[i];
        const audioPath = await this.generateSpeech(segment.text, {
          ...options,
          voice: segment.voice || options.voice
        });
        
        results.push({
          id: segment.id || i,
          text: segment.text,
          audioPath,
          voice: segment.voice || options.voice,
          timestamp: segment.timestamp || null
        });
      }

      logger.info('Batch speech generation completed', { 
        segments: results.length 
      });

      return results;
    } catch (error) {
      logger.error('Batch speech generation failed', { error: error.message });
      throw error;
    }
  }

  async combineAudioSegments(segments, outputPath) {
    try {
      logger.info('Combining audio segments', { 
        segments: segments.length, 
        outputPath 
      });

      // Create ffmpeg concat file
      const concatFile = path.join(this.cacheDir, `${uuidv4()}.txt`);
      const concatContent = segments
        .map(segment => `file '${segment.audioPath}'`)
        .join('\n');
      
      await fs.writeFile(concatFile, concatContent);

      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-f', 'concat',
          '-safe', '0',
          '-i', concatFile,
          '-c', 'copy',
          '-y',
          outputPath
        ]);

        ffmpeg.on('close', async (code) => {
          try {
            // Clean up concat file
            await fs.unlink(concatFile);
            
            if (code === 0) {
              resolve(outputPath);
            } else {
              reject(new Error(`Audio combination failed with code ${code}`));
            }
          } catch (error) {
            reject(error);
          }
        });

        ffmpeg.on('error', reject);
      });
    } catch (error) {
      logger.error('Audio combination failed', { error: error.message });
      throw error;
    }
  }

  async generateSpeechWithTimestamps(transcript, options = {}) {
    try {
      // Parse transcript with timestamps
      const segments = this.parseTranscriptWithTimestamps(transcript);
      
      // Generate speech for each segment
      const audioSegments = await this.generateBatch(segments, options);
      
      // Combine segments with proper timing
      const finalAudioPath = path.join(
        this.cacheDir, 
        `speech_${uuidv4()}.${options.format || 'wav'}`
      );
      
      await this.combineAudioSegments(audioSegments, finalAudioPath);
      
      return {
        audioPath: finalAudioPath,
        segments: audioSegments,
        duration: await this.getAudioDuration(finalAudioPath)
      };
    } catch (error) {
      logger.error('Timestamped speech generation failed', { error: error.message });
      throw error;
    }
  }

  parseTranscriptWithTimestamps(transcript) {
    // Parse transcript that might have timestamps like:
    // "[00:01:23] Hello world [00:01:25] How are you?"
    const timestampRegex = /\[(\d{2}):(\d{2}):(\d{2})\]\s*([^[]+)/g;
    const segments = [];
    let match;

    while ((match = timestampRegex.exec(transcript)) !== null) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const timestamp = hours * 3600 + minutes * 60 + seconds;
      const text = match[4].trim();

      segments.push({
        id: segments.length,
        timestamp,
        text,
        voice: null // Will use default voice
      });
    }

    // If no timestamps found, treat as single segment
    if (segments.length === 0) {
      segments.push({
        id: 0,
        timestamp: 0,
        text: transcript.trim(),
        voice: null
      });
    }

    return segments;
  }

  async getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        audioPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          resolve(0);
          return;
        }

        try {
          const data = JSON.parse(output);
          resolve(parseFloat(data.format.duration) || 0);
        } catch (error) {
          resolve(0);
        }
      });

      ffprobe.on('error', () => resolve(0));
    });
  }

  generateCacheKey(text, options) {
    const key = `${text}_${options.provider}_${options.voice}_${options.speed}_${options.pitch}`;
    return Buffer.from(key).toString('base64').slice(0, 32);
  }

  async loadCache() {
    try {
      const cacheFile = path.join(this.cacheDir, 'cache.json');
      const data = await fs.readFile(cacheFile, 'utf8');
      const cacheData = JSON.parse(data);
      
      for (const [key, value] of Object.entries(cacheData)) {
        this.cache.set(key, value);
      }
      
      logger.info('TTS cache loaded', { entries: this.cache.size });
    } catch (error) {
      logger.debug('No existing TTS cache found');
    }
  }

  async saveCacheEntry(key, value) {
    try {
      // Check cache size limit
      if (this.cache.size > 1000) { // Limit to 1000 entries
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      const cacheFile = path.join(this.cacheDir, 'cache.json');
      const cacheData = Object.fromEntries(this.cache);
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      logger.warn('Failed to save TTS cache', { error: error.message });
    }
  }

  async clearCache() {
    try {
      this.cache.clear();
      const files = await fs.readdir(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.wav') || file.endsWith('.mp3')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      
      logger.info('TTS cache cleared');
    } catch (error) {
      logger.error('Failed to clear TTS cache', { error: error.message });
    }
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheEnabled: config.tts.cacheEnabled,
      provider: config.tts.provider,
      supportedVoices: this.getSupportedVoices()
    };
  }

  getSupportedVoices() {
    // Return available voices based on provider
    switch (config.tts.provider) {
      case 'google':
        return [
          'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'
        ];
      case 'espeak':
        return [
          'en', 'en-us', 'en-gb', 'es', 'fr', 'de', 'it', 'pt', 'ru'
        ];
      case 'system':
      default:
        return say.getInstalledVoices();
    }
  }
}

// Create singleton instance
let ttsInstance = null;

export function getTTSService() {
  if (!ttsInstance) {
    ttsInstance = new TTSService();
  }
  return ttsInstance;
}

export default TTSService;
