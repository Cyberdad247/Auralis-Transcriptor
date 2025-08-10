import { EventEmitter } from 'events';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

class InMemoryQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = [];
    this.processing = new Set();
    this.workers = [];
    this.isRunning = false;
    this.concurrency = config.queue.concurrency || 3;
    this.pollInterval = config.queue.pollInterval || 5000;
  }

  async addJob(jobData) {
    const job = {
      id: jobData.id || Date.now().toString(),
      type: jobData.type,
      data: jobData.data,
      attempts: 0,
      maxAttempts: jobData.maxAttempts || 3,
      createdAt: new Date(),
      delay: jobData.delay || 0
    };

    // Add delay if specified
    if (job.delay > 0) {
      setTimeout(() => {
        this.jobs.push(job);
        this.emit('job-added', job);
        logger.debug('Delayed job added to queue', { jobId: job.id, type: job.type });
      }, job.delay);
    } else {
      this.jobs.push(job);
      this.emit('job-added', job);
      logger.debug('Job added to queue', { jobId: job.id, type: job.type });
    }

    return job.id;
  }

  async getJob() {
    if (this.jobs.length === 0) {
      return null;
    }

    // Get the oldest job
    const job = this.jobs.shift();
    this.processing.add(job.id);
    
    logger.debug('Job retrieved from queue', { jobId: job.id, type: job.type });
    return job;
  }

  async completeJob(jobId) {
    this.processing.delete(jobId);
    this.emit('job-completed', jobId);
    logger.debug('Job completed', { jobId });
  }

  async failJob(jobId, error) {
    this.processing.delete(jobId);
    this.emit('job-failed', { jobId, error });
    logger.error('Job failed', { jobId, error: error.message });
  }

  async retryJob(job, error) {
    job.attempts++;
    job.lastError = error.message;
    job.lastAttemptAt = new Date();

    if (job.attempts < job.maxAttempts) {
      // Add exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
      job.delay = delay;
      
      logger.warn('Retrying job', { 
        jobId: job.id, 
        attempt: job.attempts, 
        maxAttempts: job.maxAttempts,
        delay 
      });
      
      setTimeout(() => {
        this.jobs.push(job);
      }, delay);
    } else {
      logger.error('Job failed permanently after max attempts', { 
        jobId: job.id, 
        attempts: job.attempts,
        error: error.message 
      });
      this.emit('job-failed-permanently', { job, error });
    }

    this.processing.delete(job.id);
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Queue service started', { concurrency: this.concurrency });

    // Start worker processes
    for (let i = 0; i < this.concurrency; i++) {
      this.startWorker(i);
    }
  }

  stop() {
    this.isRunning = false;
    this.workers.forEach(worker => clearTimeout(worker));
    this.workers = [];
    logger.info('Queue service stopped');
  }

  async startWorker(workerId) {
    const processJob = async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        const job = await this.getJob();
        
        if (job) {
          logger.debug('Worker processing job', { workerId, jobId: job.id, type: job.type });
          
          try {
            // Emit job processing event
            this.emit('job-processing', { workerId, job });
            
            // Process the job (this will be handled by registered handlers)
            await this.processJob(job);
            
            await this.completeJob(job.id);
            logger.info('Job processed successfully', { workerId, jobId: job.id });
          } catch (error) {
            logger.error('Job processing failed', { workerId, jobId: job.id, error: error.message });
            await this.retryJob(job, error);
          }
        }
      } catch (error) {
        logger.error('Worker error', { workerId, error: error.message });
      }

      // Schedule next job processing
      const timeout = setTimeout(processJob, this.pollInterval);
      this.workers[workerId] = timeout;
    };

    processJob();
  }

  async processJob(job) {
    // This method should be overridden or handled by event listeners
    this.emit('process-job', job);
  }

  getStats() {
    return {
      queueLength: this.jobs.length,
      processing: this.processing.size,
      isRunning: this.isRunning,
      concurrency: this.concurrency,
      workers: this.workers.length
    };
  }
}

class SQSQueue {
  constructor() {
    // Placeholder for SQS implementation
    this.isConfigured = false;
  }

  async addJob(jobData) {
    // TODO: Implement SQS job addition
    logger.warn('SQS queue not implemented yet, falling back to in-memory queue');
    throw new Error('SQS queue not implemented');
  }

  async getJob() {
    // TODO: Implement SQS job retrieval
    throw new Error('SQS queue not implemented');
  }

  async completeJob(jobId) {
    // TODO: Implement SQS job completion
    throw new Error('SQS queue not implemented');
  }

  async failJob(jobId, error) {
    // TODO: Implement SQS job failure
    throw new Error('SQS queue not implemented');
  }
}

// Factory function to create the appropriate queue type
export function createQueue() {
  const queueType = config.queue.type || 'memory';
  
  if (queueType === 'sqs' && config.aws.sqs.queueUrl) {
    try {
      return new SQSQueue();
    } catch (error) {
      logger.warn('Failed to create SQS queue, falling back to in-memory', { error: error.message });
      return new InMemoryQueue();
    }
  }
  
  return new InMemoryQueue();
}

// Singleton queue instance
let queueInstance = null;

export class QueueService {
  static getInstance() {
    if (!queueInstance) {
      queueInstance = createQueue();
    }
    return queueInstance;
  }

  static async addTranscriptionJob(transcriptionId) {
    const queue = this.getInstance();
    
    const jobId = await queue.addJob({
      type: 'transcription',
      data: { transcriptionId },
      maxAttempts: 3
    });

    logger.info('Transcription job added to queue', { transcriptionId, jobId });
    return jobId;
  }

  static async start() {
    const queue = this.getInstance();
    
    // Register job processing handler
    queue.on('process-job', async (job) => {
      if (job.type === 'transcription') {
        const { TranscriptionService } = await import('./transcriptionService.js');
        await TranscriptionService.processTranscription(job.data.transcriptionId);
      }
    });

    // Register event handlers
    queue.on('job-completed', (jobId) => {
      logger.info('Queue job completed', { jobId });
    });

    queue.on('job-failed', ({ jobId, error }) => {
      logger.error('Queue job failed', { jobId, error });
    });

    queue.on('job-failed-permanently', ({ job, error }) => {
      logger.error('Queue job failed permanently', { 
        jobId: job.id, 
        type: job.type, 
        attempts: job.attempts,
        error 
      });
    });

    queue.start();
    logger.info('Queue service started successfully');
  }

  static async stop() {
    const queue = this.getInstance();
    queue.stop();
    logger.info('Queue service stopped');
  }

  static getStats() {
    const queue = this.getInstance();
    return queue.getStats();
  }
}

export default QueueService;
