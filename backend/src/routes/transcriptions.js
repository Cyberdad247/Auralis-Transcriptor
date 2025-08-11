import express from 'express';
import multer from 'multer';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { query, transaction } from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';
import { QueueService } from '../services/queueService.js';
import { FileService } from '../services/fileService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = config.upload.uploadDir;
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedTypes.some(type => file.mimetype.includes(type.split('/')[1]))) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Validation schemas
const listTranscriptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('UPLOADED', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'COMPLETED', 'FAILED').optional(),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'duration_seconds', 'file_size').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// Upload and create transcription
router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const file = req.file;
  
  await transaction(async (client) => {
    try {
      // Create transcription record
      const transcriptionResult = await client.query(`
        INSERT INTO transcriptions (
          user_id, 
          original_filename, 
          file_type, 
          file_size, 
          original_file_url,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        req.user.id,
        file.originalname,
        file.mimetype,
        file.size,
        file.path,
        'UPLOADED'
      ]);

      const transcription = transcriptionResult.rows[0];

      // Log the upload
      logger.info('File uploaded successfully', {
        userId: req.user.id,
        transcriptionId: transcription.id,
        filename: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype
      });

      // Queue for processing (asynchronously)
      QueueService.addTranscriptionJob(transcription.id).catch(error => {
        logger.error('Error queueing transcription:', error);
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully and queued for processing',
        data: {
          transcription: {
            id: transcription.id,
            originalFilename: transcription.original_filename,
            fileType: transcription.file_type,
            fileSize: transcription.file_size,
            status: transcription.status,
            createdAt: transcription.created_at
          }
        }
      });
    } catch (error) {
      // Clean up uploaded file if database operation fails
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.error('Failed to clean up uploaded file:', unlinkError);
      }
      throw error;
    }
  });
}));

// Get user's transcriptions
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = listTranscriptionsSchema.validate(req.query);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { page, limit, status, sortBy, order } = value;
  const offset = (page - 1) * limit;

  // Build query conditions
  const conditions = ['user_id = $1'];
  const params = [req.user.id];

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  // Get transcriptions with pagination
  const transcriptionsResult = await query(`
    SELECT 
      id,
      original_filename,
      file_type,
      file_size,
      status,
      duration_seconds,
      processing_started_at,
      processing_completed_at,
      error_message,
      created_at,
      updated_at
    FROM transcriptions
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${sortBy} ${order.toUpperCase()}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM transcriptions
    WHERE ${conditions.join(' AND ')}
  `, params);

  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      transcriptions: transcriptionsResult.rows.map(t => ({
        id: t.id,
        originalFilename: t.original_filename,
        fileType: t.file_type,
        fileSize: t.file_size,
        status: t.status,
        durationSeconds: t.duration_seconds,
        processingStartedAt: t.processing_started_at,
        processingCompletedAt: t.processing_completed_at,
        errorMessage: t.error_message,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
}));

// Get specific transcription
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const transcriptionResult = await query(`
    SELECT *
    FROM transcriptions
    WHERE id = $1 AND user_id = $2
  `, [req.params.id, req.user.id]);

  if (transcriptionResult.rows.length === 0) {
    throw new NotFoundError('Transcription not found');
  }

  const transcription = transcriptionResult.rows[0];

  res.json({
    success: true,
    data: {
      transcription: {
        id: transcription.id,
        originalFilename: transcription.original_filename,
        fileType: transcription.file_type,
        fileSize: transcription.file_size,
        status: transcription.status,
        durationSeconds: transcription.duration_seconds,
        transcriptText: transcription.transcript_text,
        processingStartedAt: transcription.processing_started_at,
        processingCompletedAt: transcription.processing_completed_at,
        errorMessage: transcription.error_message,
        metadata: transcription.metadata,
        createdAt: transcription.created_at,
        updatedAt: transcription.updated_at
      }
    }
  });
}));

// Download transcript as text file
router.get('/:id/download/txt', authenticateToken, asyncHandler(async (req, res) => {
  const transcriptionResult = await query(`
    SELECT original_filename, transcript_text, status
    FROM transcriptions
    WHERE id = $1 AND user_id = $2
  `, [req.params.id, req.user.id]);

  if (transcriptionResult.rows.length === 0) {
    throw new NotFoundError('Transcription not found');
  }

  const transcription = transcriptionResult.rows[0];

  if (transcription.status !== 'COMPLETED' || !transcription.transcript_text) {
    throw new ValidationError('Transcription is not completed or has no text');
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${transcription.original_filename}.txt"`);
  res.send(transcription.transcript_text);
}));

// Download transcript as markdown file
router.get('/:id/download/md', authenticateToken, asyncHandler(async (req, res) => {
  const transcriptionResult = await query(`
    SELECT original_filename, transcript_text, status, duration_seconds, created_at
    FROM transcriptions
    WHERE id = $1 AND user_id = $2
  `, [req.params.id, req.user.id]);

  if (transcriptionResult.rows.length === 0) {
    throw new NotFoundError('Transcription not found');
  }

  const transcription = transcriptionResult.rows[0];

  if (transcription.status !== 'COMPLETED' || !transcription.transcript_text) {
    throw new ValidationError('Transcription is not completed or has no text');
  }

  // Format as markdown
  const markdown = `# ${transcription.original_filename}

**Transcription Date:** ${new Date(transcription.created_at).toLocaleDateString()}
**Duration:** ${transcription.duration_seconds ? Math.floor(transcription.duration_seconds / 60) + ':' + (transcription.duration_seconds % 60).toString().padStart(2, '0') : 'Unknown'}

---

${transcription.transcript_text}

---

*Generated by Auralis Transcriptor - Starfleet Linguistic Analysis System*
`;

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${transcription.original_filename}.md"`);
  res.send(markdown);
}));

// Delete transcription
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  await transaction(async (client) => {
    // Get transcription details
    const transcriptionResult = await client.query(`
      SELECT original_file_url, processed_audio_url
      FROM transcriptions
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (transcriptionResult.rows.length === 0) {
      throw new NotFoundError('Transcription not found');
    }

    const transcription = transcriptionResult.rows[0];

    // Delete the database record
    await client.query(
      'DELETE FROM transcriptions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    // Clean up files (async, don't block response)
    if (transcription.original_file_url) {
      FileService.deleteFile(transcription.original_file_url).catch(error => {
        logger.error('Failed to delete original file:', error);
      });
    }
    if (transcription.processed_audio_url) {
      FileService.deleteFile(transcription.processed_audio_url).catch(error => {
        logger.error('Failed to delete processed audio file:', error);
      });
    }

    logger.info('Transcription deleted', {
      userId: req.user.id,
      transcriptionId: req.params.id
    });

    res.json({
      success: true,
      message: 'Transcription deleted successfully'
    });
  });
}));

// Get transcription statistics
router.get('/stats/summary', authenticateToken, asyncHandler(async (req, res) => {
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_transcriptions,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transcriptions,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_transcriptions,
      COUNT(CASE WHEN status IN ('UPLOADED', 'PROCESSING_AUDIO', 'TRANSCRIBING') THEN 1 END) as processing_transcriptions,
      SUM(CASE WHEN status = 'COMPLETED' THEN duration_seconds ELSE 0 END) as total_duration_seconds,
      SUM(file_size) as total_file_size_bytes,
      MAX(created_at) as last_transcription_date
    FROM transcriptions
    WHERE user_id = $1
  `, [req.user.id]);

  const stats = statsResult.rows[0];

  res.json({
    success: true,
    data: {
      stats: {
        totalTranscriptions: parseInt(stats.total_transcriptions),
        completedTranscriptions: parseInt(stats.completed_transcriptions),
        failedTranscriptions: parseInt(stats.failed_transcriptions),
        processingTranscriptions: parseInt(stats.processing_transcriptions),
        totalDurationSeconds: parseInt(stats.total_duration_seconds) || 0,
        totalFileSizeBytes: parseInt(stats.total_file_size_bytes) || 0,
        lastTranscriptionDate: stats.last_transcription_date,
        successRate: stats.total_transcriptions > 0 
          ? Math.round((stats.completed_transcriptions / stats.total_transcriptions) * 100)
          : 0
      }
    }
  });
}));

export default router;
