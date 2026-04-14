import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

const { Pool } = pg;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting database migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations/001_core_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Created providers table (with Roam Richer Originals)');
    console.log('   - Created places table');
    console.log('   - Created experiences table');
    console.log('   - Created route_templates table');
    console.log('   - Created route_versions table');
    console.log('   - Created route_days table');
    console.log('   - Created route_activities table');
    console.log('   - Created trips table');
    console.log('   - Created trip_days table');
    console.log('   - Created trip_activities table');
    console.log('   - Created trip_logs table');
    console.log('   - Created countries table');
    console.log('   - Created reviews table');
    console.log('   - Created triggers and functions');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
