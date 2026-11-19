import { pool } from '../src/config/db.js';

const main = async () => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db');
    const currentDb = rows[0]?.db;
    console.log(`Running purge_email_otps against database: ${currentDb}`);

    const [res] = await pool.query('CALL purge_email_otps()');
    console.log('Successfully called purge_email_otps().');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error running purge_email_otps:', err.message);
    await pool.end();
    process.exit(1);
  }
};

main();
