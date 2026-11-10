import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import createApp from './app.js';
import { pool } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = Number(process.env.PORT) || 5000;
const app = createApp();

const server = app.listen(PORT, async () => {
  console.log(`Chess Tournament API server running on http://localhost:${PORT}`);
  try {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = Number(process.env.DB_PORT) || 3306;
    const dbName = process.env.DB_NAME || 'chess_db';

    const [cols] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'app_user'
        AND COLUMN_NAME = 'approval_status'
      LIMIT 1
    `);
    const schemaType = cols.length > 0 ? 'new' : 'old';
    console.log(`Connected to database ${dbName} at ${host}:${port} (schema: ${schemaType})`);
  } catch (err) {
    console.error('Database connection failed on startup:', err.message);
  }
});

// Graceful shutdown handling
const shutdown = async () => {
  console.log('\nShutting down server gracefully...');
  server.close(async () => {
    try {
      await pool.end();
      console.log('Database pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
