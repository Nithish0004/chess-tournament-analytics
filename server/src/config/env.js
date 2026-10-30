import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.trim().length < 32) {
  const msg = 'FATAL: JWT_SECRET environment variable is required and must be at least 32 characters long.';
  console.error(msg);
  throw new Error(msg);
}

export const env = {
  JWT_SECRET: JWT_SECRET.trim(),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  MAIL_TRANSPORT: process.env.MAIL_TRANSPORT || 'console',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'noreply@chess-tournament.com',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

export default env;
