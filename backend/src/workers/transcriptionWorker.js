import { QueueService } from '../services/queueService.js';
import { TranscriptionService } from '../services/transcriptionService.js';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

class TranscriptionWorker {
  constructor() {
    this.isRunning = false;
    this.processedJobs = 0;
    this.failedJobs = 0;
    this.startTime = new Date();
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Transcription worker is already running');
      return;
    }

    logger.info('Starting transcription worker');
    this.isRunning = true;
    this.startTime = new Date();

    try {
      // Start the queue service
      await QueueService.start();

      // Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      // Register additional event handlers for monitoring
      this.setupEventHandlers();

      logger.info('Transcription worker started successfully', {
        concurrency: config.queue.concurrency,
        provider: config.transcription.provider
      });

    } catch (error) {
      logger.error('Failed to start transcription worker', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping transcription worker');
    this.isRunning = false;

    try {
      await QueueService.stop();
      
      const duration = Date.now() - this.startTime;
      logger.info('Transcription worker stopped', {
        duration: `${Math.round(duration / 1000)}s`,
        processedJobs: this.processedJobs,
        failedJobs: this.failedJobs,
        successRate: this.processedJobs > 0 ? Math.round((this.processedJobs / (this.processedJobs + this.failedJobs)) * 100) : 0
      });
    } catch (error) {
      logger.error('Error stopping transcription worker', { error: error.message });
    }
  }

  setupEventHandlers() {
    const queue = QueueService.getInstance();

    queue.on('job-processing', ({ workerId, job }) => {
      logger.info('Processing transcription job', {
        workerId,
        jobId: job.id,
        transcriptionId: job.data.transcriptionId,
        attempt: job.attempts + 1,
        maxAttempts: job.maxAttempts
      });
    });

    queue.on('job-completed', (jobId) => {
      this.processedJobs++;
      logger.info('Transcription job completed successfully', { 
        jobId, 
        totalProcessed: this.processedJobs 
      });
    });

    queue.on('job-failed', ({ jobId, error }) => {
      logger.warn('Transcription job failed (will retry)', { 
        jobId, 
        error: error.message 
      });
    });

    queue.on('job-failed-permanently', ({ job, error }) => {
      this.failedJobs++;
      logger.error('Transcription job failed permanently', {
        jobId: job.id,
        transcriptionId: job.data.transcriptionId,
        attempts: job.attempts,
        error: error.message,
        totalFailed: this.failedJobs
      });
    });
  }

  setupShutdownHandlers() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in transcription worker', { 
        error: error.message,
        stack: error.stack 
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection in transcription worker', { 
        reason: reason?.message || reason,
        promise: promise.toString() 
      });
      process.exit(1);
    });
  }

  getStats() {
    const queueStats = QueueService.getStats();
    const uptime = Date.now() - this.startTime;

    return {
      isRunning: this.isRunning,
      uptime: Math.round(uptime / 1000), // seconds
      processedJobs: this.processedJobs,
      failedJobs: this.failedJobs,
      successRate: this.processedJobs > 0 ? Math.round((this.processedJobs / (this.processedJobs + this.failedJobs)) * 100) : 0,
      queue: queueStats,
      config: {
        provider: config.transcription.provider,
        concurrency: config.queue.concurrency,
        pollInterval: config.queue.pollInterval
      }
    };
  }
}

// Create and export singleton instance
const worker = new TranscriptionWorker();

export { worker as TranscriptionWorker };

// If this file is run directly, start the worker
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await worker.start();
      
      // Log stats periodically
      setInterval(() => {
        const stats = worker.getStats();
        logger.info('Transcription worker stats', stats);
      }, 60000); // Every minute

      // Keep the process running
      process.stdin.resume();
    } catch (error) {
      console.error('Failed to start transcription worker:', error);
      process.exit(1);
    }
  })();
}
