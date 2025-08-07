import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { config } from './config/config.js';
import { logger } from './config/logger.js';
import { database } from './database/connection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { QueueService } from './services/queueService.js';

// Import routes
import authRoutes from './routes/auth.js';
import transcriptionRoutes from './routes/transcriptions.js';
import healthRoutes from './routes/health.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Health check route (before auth middleware)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transcriptions', transcriptionRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  
  try {
    // Stop queue service
    await QueueService.stop();
    logger.info('Queue service stopped');
    
    // Close database connections
    await database.end();
    logger.info('Database connections closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await database.query('SELECT 1');
    logger.info('Database connection established');

    // Start queue service for transcription processing
    await QueueService.start();
    logger.info('Queue service started');

    app.listen(PORT, () => {
      logger.info(`🚀 Auralis Transcriptor Backend Server running on port ${PORT}`);
      logger.info(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      logger.info(`🎤 Transcription Provider: ${config.transcription.provider}`);
      logger.info(`⚡ Queue Concurrency: ${config.queue.concurrency}`);
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                 AURALIS TRANSCRIPTOR                      ║
║           Starfleet Linguistic Analysis System           ║
║                                                           ║
║  Status: SYSTEM ONLINE                                    ║
║  Port: ${PORT}                                        ║
║  Neural Engine: OPTIMAL                                   ║
║  Data Storage: SECURED                                    ║
║  Transcription Queue: ACTIVE                              ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
