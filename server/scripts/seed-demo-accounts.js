import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';

const BCRYPT_ROUNDS = 12;

const run = async () => {
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: node scripts/seed-demo-accounts.js <password>');
    process.exit(1);
  }

  try {
    // Confirm database in use
    const [dbCheck] = await pool.query('SELECT DATABASE() as db');
    const currentDb = dbCheck[0]?.db;
    console.log(`[seed-demo-accounts] Confirmed database in use: ${currentDb}`);

    if (currentDb === 'chess_db') {
      console.error("FATAL: Refusing to seed accounts against production database 'chess_db'! Use DB_NAME=chess_scratch.");
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 1. Approved Organizer
    const approvedOrgEmail = 'organizer.approved@chess.demo';
    const approvedOrgName = 'Approved Organizer';
    await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, approval_status, email_verified, phone, organization)
       VALUES (?, ?, ?, 'ORGANIZER', 'ACTIVE', 'APPROVED', 1, '+15551234567', 'Metropolitan Chess Club')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = 'ORGANIZER',
         status = 'ACTIVE',
         approval_status = 'APPROVED',
         email_verified = 1,
         phone = VALUES(phone),
         organization = VALUES(organization)`,
      [approvedOrgEmail, passwordHash, approvedOrgName]
    );

    // 2. Pending Organizer
    const pendingOrgEmail = 'organizer.pending@chess.demo';
    const pendingOrgName = 'Pending Organizer';
    await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, approval_status, email_verified, phone, organization)
       VALUES (?, ?, ?, 'ORGANIZER', 'ACTIVE', 'PENDING', 1, '+15559876543', 'Regional Chess Guild')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = 'ORGANIZER',
         status = 'ACTIVE',
         approval_status = 'PENDING',
         email_verified = 1,
         phone = VALUES(phone),
         organization = VALUES(organization)`,
      [pendingOrgEmail, passwordHash, pendingOrgName]
    );

    // 3. Approved Player (linked to an existing demo player)
    let existingPlayerId = null;
    let existingPlayerName = 'Demo Approved Player';
    const [existingPlayers] = await pool.query('SELECT player_id, name, email FROM player ORDER BY player_id ASC LIMIT 1');

    if (existingPlayers.length > 0) {
      existingPlayerId = existingPlayers[0].player_id;
      existingPlayerName = existingPlayers[0].name;
    } else {
      // If no players in DB yet, create one
      const [newP] = await pool.query(
        `INSERT INTO player (name, email, country, date_of_birth, gender, experience_level, club, current_rating)
         VALUES ('Magnus Carlsen', 'magnus.demo@chess.demo', 'Norway', '1990-11-30', 'MALE', 'EXPERT', 'Offerspill', 2832)`
      );
      existingPlayerId = newP.insertId;
      existingPlayerName = 'Magnus Carlsen';
    }

    const approvedPlayerEmail = 'player.approved@chess.demo';
    await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, approval_status, email_verified, player_id)
       VALUES (?, ?, ?, 'PLAYER', 'ACTIVE', 'APPROVED', 1, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = 'PLAYER',
         status = 'ACTIVE',
         approval_status = 'APPROVED',
         email_verified = 1,
         player_id = VALUES(player_id)`,
      [approvedPlayerEmail, passwordHash, existingPlayerName, existingPlayerId]
    );

    // 4. Pending Player
    const pendingPlayerEmail = 'player.pending@chess.demo';
    const pendingPlayerName = 'Pending Player';
    let pendingPlayerId = null;

    const [existingPendingP] = await pool.query('SELECT player_id FROM player WHERE email = ?', [pendingPlayerEmail]);
    if (existingPendingP.length > 0) {
      pendingPlayerId = existingPendingP[0].player_id;
    } else {
      const [insertP] = await pool.query(
        `INSERT INTO player (name, email, country, date_of_birth, gender, experience_level, club, current_rating)
         VALUES (?, ?, 'India', '2005-06-15', 'OTHER', 'BEGINNER', 'Junior Chess Club', 1000)`,
        [pendingPlayerName, pendingPlayerEmail]
      );
      pendingPlayerId = insertP.insertId;
    }

    await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, approval_status, email_verified, player_id)
       VALUES (?, ?, ?, 'PLAYER', 'ACTIVE', 'PENDING', 1, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = 'PLAYER',
         status = 'ACTIVE',
         approval_status = 'PENDING',
         email_verified = 1,
         player_id = VALUES(player_id)`,
      [pendingPlayerEmail, passwordHash, pendingPlayerName, pendingPlayerId]
    );

    console.log('\n========================================');
    console.log('Demo accounts seeded successfully:');
    console.log('----------------------------------------');
    console.log(`1. Approved Organizer: ${approvedOrgEmail} (Status: ACTIVE, Approval: APPROVED)`);
    console.log(`2. Pending Organizer:  ${pendingOrgEmail} (Status: ACTIVE, Approval: PENDING)`);
    console.log(`3. Approved Player:    ${approvedPlayerEmail} (Status: ACTIVE, Approval: APPROVED, Player ID: ${existingPlayerId})`);
    console.log(`4. Pending Player:     ${pendingPlayerEmail} (Status: ACTIVE, Approval: PENDING, Player ID: ${pendingPlayerId})`);
    console.log('========================================\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed demo accounts:', err.message);
    await pool.end();
    process.exit(1);
  }
};

run();
