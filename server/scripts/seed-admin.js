import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';

const run = async () => {
  const [,, usernameArg, passwordArg, roleArg] = process.argv;

  const username = usernameArg || 'admin';
  const password = passwordArg || 'admin123';
  const role = roleArg || 'ADMIN';

  console.log(`Seeding admin user '${username}'...`);

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.query(
      `INSERT INTO admin_user (username, password_hash, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
      [username, passwordHash, role]
    );

    console.log(`Admin user '${username}' successfully seeded (ID: ${result.insertId || 'updated'}).`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin user:', err);
    process.exit(1);
  }
};

run();
