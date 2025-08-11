import express from 'express';
import { query } from '../database/connection.js';
import { config } from '../config/config.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { QueueService } from '../services/queueService.js';

const router = express.Router();

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'auralis-transcriptor-backend',
    version: '1.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await query('SELECT 1');
    const dbDuration = Date.now() - dbStart;
    
    healthCheck.checks.database = {
      status: 'healthy',
      responseTime: `${dbDuration}ms`
    };
  } catch (error) {
    healthCheck.status = 'degraded';
    healthCheck.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    logger.error('Database health check failed:', error);
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  healthCheck.checks.memory = {
    status: 'healthy',
    usage: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    }
  };

  // Check disk space (upload directory)
  try {
    const fs = await import('fs');
    const stats = await fs.promises.stat(config.upload.uploadDir);
    healthCheck.checks.uploadDirectory = {
      status: 'healthy',
      path: config.upload.uploadDir
    };
  } catch (error) {
    healthCheck.checks.uploadDirectory = {
      status: 'warning',
      message: 'Upload directory not accessible',
      error: error.message
    };
  }

  // Check FFmpeg availability
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('ffmpeg -version');
    healthCheck.checks.ffmpeg = {
      status: 'healthy',
      message: 'FFmpeg is available'
    };
  } catch (error) {
    healthCheck.checks.ffmpeg = {
      status: 'warning',
      message: 'FFmpeg not available or not in PATH'
    };
  }

  // Check queue service
  try {
    const queueStats = QueueService.getStats();
    healthCheck.checks.queue = {
      status: queueStats.isRunning ? 'healthy' : 'unhealthy',
      queueLength: queueStats.queueLength,
      processing: queueStats.processing,
      workers: queueStats.workers,
      concurrency: queueStats.concurrency
    };
  } catch (error) {
    healthCheck.checks.queue = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Determine overall status
  const hasUnhealthy = Object.values(healthCheck.checks).some(check => check.status === 'unhealthy');
  const hasWarnings = Object.values(healthCheck.checks).some(check => check.status === 'warning');
  
  if (hasUnhealthy) {
    healthCheck.status = 'unhealthy';
  } else if (hasWarnings) {
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 
                    healthCheck.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthCheck);
}));

// Detailed health check (includes more comprehensive tests)
router.get('/detailed', asyncHandler(async (req, res) => {
  const detailedCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'auralis-transcriptor-backend',
    version: '1.0.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    checks: {},
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid
    }
  };

  // Database connectivity and performance
  try {
    const dbStart = Date.now();
    const dbResult = await query(`
      SELECT 
        COUNT(*) as user_count,
        (SELECT COUNT(*) FROM transcriptions) as transcription_count,
        (SELECT COUNT(*) FROM transcriptions WHERE status = 'PROCESSING_AUDIO' OR status = 'TRANSCRIBING') as active_jobs
    `);
    const dbDuration = Date.now() - dbStart;
    
    detailedCheck.checks.database = {
      status: 'healthy',
      responseTime: `${dbDuration}ms`,
      userCount: parseInt(dbResult.rows[0].user_count),
      transcriptionCount: parseInt(dbResult.rows[0].transcription_count),
      activeJobs: parseInt(dbResult.rows[0].active_jobs)
    };
  } catch (error) {
    detailedCheck.status = 'degraded';
    detailedCheck.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Memory and CPU usage
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  detailedCheck.checks.resources = {
    status: 'healthy',
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    }
  };

  // External services status
  detailedCheck.checks.externalServices = {
    aws: {
      s3: config.aws.s3.bucket ? 'configured' : 'not configured',
      sqs: config.aws.sqs.queueUrl ? 'configured' : 'not configured',
      transcribe: config.aws.transcribe.outputBucket ? 'configured' : 'not configured'
    },
    transcriptionProvider: config.transcription.provider
  };

  // Configuration validation
  detailedCheck.checks.configuration = {
    status: 'healthy',
    uploadMaxSize: `${config.upload.maxFileSize / 1024 / 1024}MB`,
    allowedFileTypes: config.upload.allowedTypes.length,
    jwtConfigured: !!config.jwt.secret,
    databaseConfigured: !!(config.database.connectionString || config.database.password)
  };

  const statusCode = detailedCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(detailedCheck);
}));

// Readiness probe (for Kubernetes/Docker deployments)
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // Test critical dependencies
    await query('SELECT 1');
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}));

// Liveness probe (for Kubernetes/Docker deployments)
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
