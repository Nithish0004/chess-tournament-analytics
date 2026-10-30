import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';

const BCRYPT_ROUNDS = 12;

const run = async () => {
  const [,, emailArg, passwordArg, fullNameArg] = process.argv;

  if (!emailArg || !passwordArg || !fullNameArg) {
    console.error('Usage: node scripts/seed-admin.js <email> <password> <full_name>');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const password = passwordArg;
  const fullName = fullNameArg.trim();

  console.log(`Seeding ADMIN user '${email}' in app_user...`);

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', 1)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = 'ADMIN',
         status = 'ACTIVE',
         email_verified = 1`,
      [email, passwordHash, fullName]
    );

    console.log(`Admin user '${email}' successfully upserted into app_user (ID: ${result.insertId || 'updated'}).`);
    console.log(`Role: ADMIN`);
    console.log(`Status: ACTIVE`);
    console.log(`Email Verified: 1`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
    await pool.end();
    process.exit(1);
  }
};

run();
