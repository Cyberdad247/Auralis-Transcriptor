import pg from 'pg';
import { config } from '../config/config.js';
import { logger } from '../config/logger.js';
import sqliteDb, { query as sqliteQuery, transaction as sqliteTransaction, database as sqliteDatabase } from './sqliteConnection.js';

const { Pool } = pg;

// Database connection configuration
const dbConfig = config.database.connectionString 
  ? {
      connectionString: config.database.connectionString,
      ssl: config.database.ssl
    }
  : {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

// Create database pool
export const database = new Pool(dbConfig);

// Test database connection
database.on('connect', () => {
  logger.info('Database connection established');
});

database.on('error', (err) => {
  logger.error('Database connection error:', err);
});

// Helper function to execute queries with logging
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await database.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Database query executed', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query error', {
      query: text,
      duration: `${duration}ms`,
      error: error.message
    });
    throw error;
  }
}

// Helper function to get a client for transactions
export async function getClient() {
  const client = await database.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;
  
  // Add query logging to client
  client.query = async function(text, params) {
    const start = Date.now();
    try {
      const result = await originalQuery.call(this, text, params);
      const duration = Date.now() - start;
      logger.debug('Transaction query executed', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Transaction query error', {
        query: text,
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  };

  // Enhanced release function
  client.release = function(error) {
    if (error) {
      logger.error('Client released with error:', error);
    }
    return originalRelease.call(this, error);
  };

  return client;
}

// Transaction helper
export async function transaction(callback) {
  const client = await getClient();
  
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
}

export default database;
