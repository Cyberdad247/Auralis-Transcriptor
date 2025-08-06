import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { database } from './connection.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    logger.info('🚀 Starting database migration...');

    // Read the schema SQL file
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    await database.query(schemaSql);

    logger.info('✅ Database migration completed successfully');
    
    // Verify tables were created
    const tablesResult = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    logger.info('📋 Created tables:', tablesResult.rows.map(row => row.table_name));

    // Verify enums were created
    const enumsResult = await database.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      ORDER BY typname;
    `);

    logger.info('📝 Created enums:', enumsResult.rows.map(row => row.typname));

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║               DATABASE MIGRATION COMPLETE                ║
║                                                           ║
║  Tables: ${tablesResult.rows.length} created                                      ║
║  Enums: ${enumsResult.rows.length} created                                       ║
║  Status: SYSTEM READY FOR OPERATION                      ║
╚═══════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    logger.error('❌ Migration failed:', error);
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await database.end();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default runMigration;
