import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

class SQLiteDatabase {
  constructor() {
    this.db = null;
    this.dbPath = path.join(process.cwd(), 'auralis_transcriptor.db');
  }

  async connect() {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      
      logger.info('SQLite database connected', { path: this.dbPath });
      await this.initializeSchema();
      return this.db;
    } catch (error) {
      logger.error('Failed to connect to SQLite database:', error);
      throw error;
    }
  }

  async initializeSchema() {
    try {
      // Create users table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          is_active BOOLEAN DEFAULT 1,
          email_verified BOOLEAN DEFAULT 0,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create transcriptions table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS transcriptions (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          file_type TEXT,
          file_size INTEGER,
          original_file_url TEXT,
          processed_audio_url TEXT,
          transcript_text TEXT,
          status TEXT NOT NULL DEFAULT 'UPLOADED',
          duration_seconds INTEGER,
          processing_started_at DATETIME,
          processing_completed_at DATETIME,
          error_message TEXT,
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create refresh_tokens table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          revoked BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create system_logs table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          details TEXT DEFAULT '{}',
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `);

      // Create indexes
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id)');
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status)');
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)');

      logger.info('SQLite database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.db) {
      await this.connect();
    }
    
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await this.db.all(sql, params);
        return { rows };
      } else {
        const result = await this.db.run(sql, params);
        return { 
          rows: [], 
          rowCount: result.changes,
          insertId: result.lastID 
        };
      }
    } catch (error) {
      logger.error('Database query failed:', { sql, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.db) {
      await this.connect();
    }

    await this.db.run('BEGIN');
    try {
      const result = await callback(this);
      await this.db.run('COMMIT');
      return result;
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('SQLite database connection closed');
    }
  }
}

// Create singleton instance
const sqliteDb = new SQLiteDatabase();

// Export query function for compatibility with existing code
export const query = async (sql, params) => {
  return await sqliteDb.query(sql, params);
};

export const transaction = async (callback) => {
  return await sqliteDb.transaction(callback);
};

export const database = {
  query: sqliteDb.query.bind(sqliteDb),
  end: sqliteDb.close.bind(sqliteDb)
};

export default sqliteDb;
