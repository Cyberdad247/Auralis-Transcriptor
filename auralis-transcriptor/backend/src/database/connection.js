import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { config } from '../config/config.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

// Determine database type based on environment
const isDevelopment = config.nodeEnv === 'development' && !config.database.connectionString;
let pool = null;
let sqliteDb = null;

// Database initialization
async function initializeDatabase() {
  if (isDevelopment) {
    logger.info('Using SQLite for development database');
    const dbPath = path.join(process.cwd(), 'auralis_transcriptor.db');
    
    sqliteDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Initialize SQLite schema
    await initializeSQLiteSchema();
    logger.info('SQLite database initialized', { path: dbPath });
  } else {
    // Create PostgreSQL connection pool
    pool = new Pool({
      connectionString: config.database.connectionString,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    logger.info('PostgreSQL connection pool created');
  }
}

async function initializeSQLiteSchema() {
  try {
    // Create users table
    await sqliteDb.exec(`
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
    await sqliteDb.exec(`
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
    await sqliteDb.exec(`
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
    await sqliteDb.exec(`
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
    await sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id)');
    await sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status)');
    await sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)');

    logger.info('SQLite database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema:', error);
    throw error;
  }
}

// Query function - works with both PostgreSQL and SQLite
export const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    let res;
    
    if (isDevelopment && sqliteDb) {
      // Handle SQLite queries
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await sqliteDb.all(text, params);
        res = { rows, rowCount: rows.length };
      } else {
        const result = await sqliteDb.run(text, params);
        res = { 
          rows: [], 
          rowCount: result.changes || 0,
          insertId: result.lastID 
        };
      }
    } else if (pool) {
      // Handle PostgreSQL queries
      res = await pool.query(text, params);
    } else {
      throw new Error('Database not initialized');
    }
    
    const duration = Date.now() - start;
    logger.debug('Executed query', { 
      text: text.substring(0, 100), 
      duration: `${duration}ms`, 
      rows: res.rowCount || res.rows?.length || 0,
      database: isDevelopment ? 'sqlite' : 'postgresql'
    });
    
    return res;
  } catch (error) {
    logger.error('Database query error', { 
      text: text.substring(0, 100), 
      error: error.message,
      database: isDevelopment ? 'sqlite' : 'postgresql'
    });
    throw error;
  }
};

// Transaction function - works with both databases
export const transaction = async (callback) => {
  if (isDevelopment && sqliteDb) {
    await sqliteDb.run('BEGIN');
    try {
      const result = await callback({ query });
      await sqliteDb.run('COMMIT');
      return result;
    } catch (error) {
      await sqliteDb.run('ROLLBACK');
      throw error;
    }
  } else if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    throw new Error('Database not initialized');
  }
};

// Database object for compatibility
export const database = {
  query: async (text, params) => {
    if (isDevelopment && sqliteDb) {
      return await query(text, params);
    } else if (pool) {
      return await pool.query(text, params);
    } else {
      throw new Error('Database not initialized');
    }
  },
  end: async () => {
    if (isDevelopment && sqliteDb) {
      await sqliteDb.close();
      sqliteDb = null;
      logger.info('SQLite database connection closed');
    } else if (pool) {
      await pool.end();
      pool = null;
      logger.info('PostgreSQL connection pool closed');
    }
  }
};

// Initialize database on module load
await initializeDatabase();

export default { query, transaction, database };
