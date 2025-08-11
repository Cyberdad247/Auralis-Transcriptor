import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

export class FileService {
  static async deleteFile(filePath) {
    try {
      if (!filePath) return;

      // Handle both local paths and URLs
      let localPath = filePath;
      
      // If it's a URL (future S3 integration), extract the local path for now
      if (filePath.startsWith('http')) {
        // For future S3 integration
        logger.warn('S3 file deletion not implemented yet', { filePath });
        return;
      }

      // Check if file exists before attempting to delete
      try {
        await fs.access(localPath);
        await fs.unlink(localPath);
        logger.info('File deleted successfully', { filePath: localPath });
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info('File not found, already deleted', { filePath: localPath });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error deleting file', { filePath, error: error.message });
      throw error;
    }
  }

  static async uploadToS3(filePath, fileName) {
    // Placeholder for S3 upload implementation
    // When AWS credentials are available, this will upload to S3
    try {
      if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
        logger.info('AWS credentials not configured, skipping S3 upload');
        return filePath; // Return local path for now
      }

      // TODO: Implement S3 upload
      /*
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        region: config.aws.region,
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      });

      const fileContent = await fs.readFile(filePath);
      const uploadParams = {
        Bucket: config.aws.s3.bucket,
        Key: fileName,
        Body: fileContent,
        ContentType: mime.getType(filePath) || 'application/octet-stream'
      };

      const result = await s3.upload(uploadParams).promise();
      
      // Delete local file after successful upload
      await fs.unlink(filePath);
      
      logger.info('File uploaded to S3 successfully', { 
        localPath: filePath, 
        s3Url: result.Location 
      });
      
      return result.Location;
      */

      logger.info('S3 upload skipped - using local storage', { filePath });
      return filePath;
    } catch (error) {
      logger.error('S3 upload failed', { filePath, error: error.message });
      throw error;
    }
  }

  static async downloadFromS3(s3Url, localPath) {
    // Placeholder for S3 download implementation
    try {
      if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
        logger.info('AWS credentials not configured, skipping S3 download');
        return s3Url; // Return S3 URL for now
      }

      // TODO: Implement S3 download
      /*
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        region: config.aws.region,
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      });

      const urlParts = new URL(s3Url);
      const bucket = urlParts.hostname.split('.')[0];
      const key = urlParts.pathname.substring(1);

      const downloadParams = {
        Bucket: bucket,
        Key: key
      };

      const result = await s3.getObject(downloadParams).promise();
      await fs.writeFile(localPath, result.Body);
      
      logger.info('File downloaded from S3 successfully', { 
        s3Url, 
        localPath 
      });
      
      return localPath;
      */

      logger.info('S3 download skipped', { s3Url });
      return s3Url;
    } catch (error) {
      logger.error('S3 download failed', { s3Url, error: error.message });
      throw error;
    }
  }

  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        logger.error('Error creating directory', { dirPath, error: error.message });
        throw error;
      }
    }
  }

  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      logger.error('Error getting file stats', { filePath, error: error.message });
      throw error;
    }
  }

  static async cleanupOldFiles(directoryPath, maxAgeHours = 24) {
    try {
      const files = await fs.readdir(directoryPath);
      const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
      
      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.isFile() && stats.mtime < cutoffTime) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
            logger.debug('Deleted old file', { filePath, age: stats.mtime });
          }
        } catch (error) {
          logger.warn('Error processing file during cleanup', { filePath, error: error.message });
        }
      }

      logger.info('File cleanup completed', { 
        directoryPath, 
        deletedCount, 
        totalSizeFreed: totalSize,
        maxAgeHours 
      });

      return { deletedCount, totalSizeFreed: totalSize };
    } catch (error) {
      logger.error('Error during file cleanup', { directoryPath, error: error.message });
      throw error;
    }
  }

  static validateFileType(fileName, mimeType) {
    const allowedTypes = config.upload.allowedTypes;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Check MIME type
    const isValidMimeType = allowedTypes.some(type => 
      mimeType.includes(type.split('/')[1])
    );

    // Check file extension as additional validation
    const validExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.mp4', '.mov', '.avi', '.mkv'];
    const isValidExtension = validExtensions.includes(fileExtension);

    return isValidMimeType && isValidExtension;
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async getDiskUsage(directoryPath) {
    try {
      const files = await fs.readdir(directoryPath, { withFileTypes: true });
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(directoryPath, file.name);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          fileCount++;
        }
      }

      return {
        totalSize,
        fileCount,
        formattedSize: this.formatFileSize(totalSize)
      };
    } catch (error) {
      logger.error('Error calculating disk usage', { directoryPath, error: error.message });
      return { totalSize: 0, fileCount: 0, formattedSize: '0 Bytes' };
    }
  }
}
