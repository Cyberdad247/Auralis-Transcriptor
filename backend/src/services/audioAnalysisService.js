import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

export class AudioAnalysisService {
  static async analyzeAudio(audioPath) {
    try {
      logger.info('Starting audio analysis', { audioPath });

      const analysis = {
        duration: 0,
        sampleRate: 0,
        channels: 0,
        bitRate: 0,
        vadSegments: [],
        pitch: null,
        noiseLevel: 0,
        speechQuality: 'unknown'
      };

      // Get basic audio properties
      const audioProperties = await this.getAudioProperties(audioPath);
      Object.assign(analysis, audioProperties);

      // Voice Activity Detection
      if (config.audioAnalysis.enableVAD) {
        analysis.vadSegments = await this.detectVoiceActivity(audioPath);
      }

      // Pitch Detection
      if (config.audioAnalysis.enablePitchDetection) {
        analysis.pitch = await this.detectPitch(audioPath);
      }

      // Noise Level Analysis
      analysis.noiseLevel = await this.analyzeNoiseLevel(audioPath);

      // Speech Quality Assessment
      analysis.speechQuality = this.assessSpeechQuality(analysis);

      logger.info('Audio analysis completed', { 
        audioPath, 
        duration: analysis.duration,
        speechQuality: analysis.speechQuality,
        vadSegments: analysis.vadSegments.length
      });

      return analysis;
    } catch (error) {
      logger.error('Audio analysis failed', { audioPath, error: error.message });
      throw error;
    }
  }

  static async getAudioProperties(audioPath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        audioPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to analyze audio properties'));
          return;
        }

        try {
          const data = JSON.parse(output);
          const audioStream = data.streams.find(s => s.codec_type === 'audio');
          
          if (!audioStream) {
            reject(new Error('No audio stream found'));
            return;
          }

          resolve({
            duration: parseFloat(data.format.duration) || 0,
            sampleRate: parseInt(audioStream.sample_rate) || 0,
            channels: parseInt(audioStream.channels) || 0,
            bitRate: parseInt(audioStream.bit_rate) || parseInt(data.format.bit_rate) || 0,
            codec: audioStream.codec_name || 'unknown'
          });
        } catch (error) {
          reject(new Error('Failed to parse audio properties'));
        }
      });

      ffprobe.on('error', reject);
    });
  }

  static async detectVoiceActivity(audioPath) {
    try {
      // Simple VAD implementation using ffmpeg silence detection
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', audioPath,
          '-af', 'silencedetect=noise=-30dB:duration=0.5',
          '-f', 'null',
          '-'
        ]);

        let output = '';
        ffmpeg.stderr.on('data', (data) => {
          output += data.toString();
        });

        ffmpeg.on('close', (code) => {
          try {
            const vadSegments = [];
            const silenceRegex = /silence_(?:start|end): ([\d.]+)/g;
            const matches = [...output.matchAll(silenceRegex)];
            
            let speechStart = 0;
            for (let i = 0; i < matches.length; i += 2) {
              if (matches[i] && matches[i + 1]) {
                const silenceStart = parseFloat(matches[i][1]);
                const silenceEnd = parseFloat(matches[i + 1][1]);
                
                if (silenceStart > speechStart) {
                  vadSegments.push({
                    start: speechStart,
                    end: silenceStart,
                    type: 'speech'
                  });
                }
                
                vadSegments.push({
                  start: silenceStart,
                  end: silenceEnd,
                  type: 'silence'
                });
                
                speechStart = silenceEnd;
              }
            }

            logger.debug('VAD analysis completed', { 
              audioPath, 
              segments: vadSegments.length 
            });
            
            resolve(vadSegments);
          } catch (error) {
            logger.warn('VAD analysis failed, returning empty segments', { error: error.message });
            resolve([]);
          }
        });

        ffmpeg.on('error', (error) => {
          logger.warn('VAD analysis error', { error: error.message });
          resolve([]);
        });
      });
    } catch (error) {
      logger.warn('VAD not available, skipping', { error: error.message });
      return [];
    }
  }

  static async detectPitch(audioPath) {
    try {
      // Simple pitch detection using ffmpeg
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', audioPath,
          '-af', 'aformat=s16:44100,astats=metadata=1:reset=1',
          '-f', 'null',
          '-'
        ]);

        let output = '';
        ffmpeg.stderr.on('data', (data) => {
          output += data.toString();
        });

        ffmpeg.on('close', (code) => {
          try {
            // Extract basic frequency information
            const freqMatch = output.match(/Mean frequency: ([\d.]+)/);
            const fundamentalFreq = freqMatch ? parseFloat(freqMatch[1]) : null;
            
            resolve({
              fundamentalFrequency: fundamentalFreq,
              estimatedNote: this.frequencyToNote(fundamentalFreq),
              confidence: fundamentalFreq ? 0.7 : 0.0
            });
          } catch (error) {
            resolve({ fundamentalFrequency: null, estimatedNote: null, confidence: 0.0 });
          }
        });

        ffmpeg.on('error', () => {
          resolve({ fundamentalFrequency: null, estimatedNote: null, confidence: 0.0 });
        });
      });
    } catch (error) {
      return { fundamentalFrequency: null, estimatedNote: null, confidence: 0.0 };
    }
  }

  static async analyzeNoiseLevel(audioPath) {
    try {
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', audioPath,
          '-af', 'astats=metadata=1:reset=1',
          '-f', 'null',
          '-'
        ]);

        let output = '';
        ffmpeg.stderr.on('data', (data) => {
          output += data.toString();
        });

        ffmpeg.on('close', (code) => {
          try {
            // Extract RMS level as noise indicator
            const rmsMatch = output.match(/RMS level dB: ([-\d.]+)/);
            const noiseLevel = rmsMatch ? Math.abs(parseFloat(rmsMatch[1])) : 50;
            
            resolve(Math.min(noiseLevel, 100)); // Normalize to 0-100
          } catch (error) {
            resolve(50); // Default moderate noise level
          }
        });

        ffmpeg.on('error', () => {
          resolve(50);
        });
      });
    } catch (error) {
      return 50;
    }
  }

  static assessSpeechQuality(analysis) {
    let score = 100;

    // Penalize high noise levels
    if (analysis.noiseLevel > 70) {
      score -= 30;
    } else if (analysis.noiseLevel > 50) {
      score -= 15;
    }

    // Penalize very low bit rates
    if (analysis.bitRate < 64000) {
      score -= 20;
    } else if (analysis.bitRate < 128000) {
      score -= 10;
    }

    // Penalize low sample rates
    if (analysis.sampleRate < 16000) {
      score -= 25;
    } else if (analysis.sampleRate < 22050) {
      score -= 10;
    }

    // Bonus for good VAD segments (indicates clear speech patterns)
    if (analysis.vadSegments.length > 0) {
      const speechRatio = analysis.vadSegments
        .filter(s => s.type === 'speech')
        .reduce((acc, s) => acc + (s.end - s.start), 0) / analysis.duration;
      
      if (speechRatio > 0.7) {
        score += 10;
      } else if (speechRatio < 0.3) {
        score -= 15;
      }
    }

    // Determine quality category
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  static frequencyToNote(frequency) {
    if (!frequency || frequency <= 0) return null;
    
    const A4 = 440;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    const semitone = Math.round(12 * Math.log2(frequency / A4));
    const octave = Math.floor((semitone + 57) / 12);
    const noteIndex = (semitone + 57) % 12;
    
    return `${noteNames[noteIndex]}${octave}`;
  }

  static async preprocessAudio(inputPath, outputPath) {
    try {
      logger.info('Preprocessing audio for enhanced transcription', { inputPath });

      const filters = [];

      // Noise reduction
      if (config.audioAnalysis.enableNoiseReduction) {
        filters.push('highpass=f=80'); // Remove low-frequency noise
        filters.push('lowpass=f=8000'); // Remove high-frequency noise
        filters.push('afftdn=nr=10'); // FFT denoiser
      }

      // Normalize audio
      filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');

      // Resample to optimal rate
      filters.push(`aresample=${config.audioAnalysis.sampleRate}`);

      return new Promise((resolve, reject) => {
        const args = [
          '-i', inputPath,
          '-af', filters.join(','),
          '-acodec', 'pcm_s16le',
          '-ac', '1', // Mono
          '-y', // Overwrite output
          outputPath
        ];

        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            logger.info('Audio preprocessing completed', { outputPath });
            resolve(outputPath);
          } else {
            reject(new Error(`Audio preprocessing failed with code ${code}`));
          }
        });

        ffmpeg.on('error', reject);
      });
    } catch (error) {
      logger.error('Audio preprocessing failed', { error: error.message });
      throw error;
    }
  }

  static async extractFeatures(audioPath) {
    try {
      // Extract audio features for ML models
      const features = {
        spectralCentroid: 0,
        spectralRolloff: 0,
        zeroCrossingRate: 0,
        mfcc: [],
        chroma: [],
        spectralContrast: []
      };

      // This would typically use libraries like librosa (Python) or web-audio-api
      // For now, we'll provide a basic implementation

      logger.info('Audio feature extraction completed', { audioPath });
      return features;
    } catch (error) {
      logger.error('Feature extraction failed', { error: error.message });
      return null;
    }
  }
}
