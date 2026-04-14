import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try multiple paths for .env (workspace root or backend folder)
dotenv.config({ path: path.join(__dirname, '../../..', '.env') }); // workspace root
dotenv.config({ path: path.join(__dirname, '../..', '.env') }); // backend folder

const { Pool } = pg;

// Create pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export { pool };

// Helper for transactions
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
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
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length === 1;
  } catch {
    return false;
  }
}
