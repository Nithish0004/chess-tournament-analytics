import { pool } from '../src/config/db.js';

export const DEMO_EMAIL_DOMAIN = '@demo.chessmagic.test';
export const DEMO_TOURNAMENT_NAMES = [
  'Bengaluru Blitz',
  'Mysuru Rapid Cup',
  'RVCE Open 2026',
  'Karnataka Classic'
];

/**
 * Foreign-key-safe reset of ONLY demo data.
 * Does not touch real accounts or non-demo data.
 * Never runs DROP DATABASE or TRUNCATE.
 */
export const resetDemo = async (connection = null) => {
  const conn = connection || (await pool.getConnection());
  const shouldRelease = !connection;

  try {
    const [dbCheck] = await conn.query('SELECT DATABASE() AS current_db');
    const currentDb = dbCheck[0]?.current_db;
    if (currentDb === 'chess_db') {
      throw new Error("ABORT: Refusing to reset demo data against production database 'chess_db'! Use DB_NAME=chess_scratch.");
    }

    const emailPattern = `%${DEMO_EMAIL_DOMAIN}`;

    // 1. Identify demo tournament IDs
    const [tournaments] = await conn.query(
      `SELECT tournament_id, name FROM tournament 
       WHERE name IN (?, ?, ?, ?)
          OR created_by IN (SELECT user_id FROM app_user WHERE email LIKE ?)`,
      [...DEMO_TOURNAMENT_NAMES, emailPattern]
    );
    const tournamentIds = tournaments.map(t => t.tournament_id);

    // 2. Identify demo player IDs
    const [players] = await conn.query(
      'SELECT player_id FROM player WHERE email LIKE ?',
      [emailPattern]
    );
    const playerIds = players.map(p => p.player_id);

    // 3. Identify demo user IDs
    const [users] = await conn.query(
      'SELECT user_id FROM app_user WHERE email LIKE ?',
      [emailPattern]
    );
    const userIds = users.map(u => u.user_id);

    let deletedPredictions = 0;
    let deletedTournaments = 0;
    let deletedPlayers = 0;
    let deletedUsers = 0;

    // 4. Delete predictions for demo tournaments or demo players
    if (tournamentIds.length > 0 || playerIds.length > 0) {
      const predConditions = [];
      const predParams = [];
      if (tournamentIds.length > 0) {
        predConditions.push(`tournament_id IN (${tournamentIds.map(() => '?').join(',')})`);
        predParams.push(...tournamentIds);
      }
      if (playerIds.length > 0) {
        predConditions.push(`player_id IN (${playerIds.map(() => '?').join(',')})`);
        predParams.push(...playerIds);
      }
      const [predRes] = await conn.query(
        `DELETE FROM prediction WHERE ${predConditions.join(' OR ')}`,
        predParams
      );
      deletedPredictions = predRes.affectedRows;
    }

    // 5. Delete demo tournaments
    // Cascade deletes tournament_round, game, result, rating_history, tournament_standings, registration
    if (tournamentIds.length > 0) {
      // First delete game_prediction if any exist for games in these tournaments
      await conn.query(
        `DELETE FROM game_prediction WHERE game_id IN (
           SELECT g.game_id FROM game g
           JOIN tournament_round tr ON tr.round_id = g.round_id
           WHERE tr.tournament_id IN (${tournamentIds.map(() => '?').join(',')})
         )`,
        tournamentIds
      );

      const [tRes] = await conn.query(
        `DELETE FROM tournament WHERE tournament_id IN (${tournamentIds.map(() => '?').join(',')})`,
        tournamentIds
      );
      deletedTournaments = tRes.affectedRows;
    }

    // 6. Unlink demo players from app_user and user_account to avoid FK restrict
    await conn.query('UPDATE app_user SET player_id = NULL WHERE email LIKE ?', [emailPattern]);
    await conn.query('UPDATE user_account SET player_id = NULL WHERE email LIKE ?', [emailPattern]);

    // 7. Delete demo players
    if (playerIds.length > 0) {
      // Also ensure unlinked from any residual tables if needed
      const [pRes] = await conn.query(
        `DELETE FROM player WHERE player_id IN (${playerIds.map(() => '?').join(',')})`,
        playerIds
      );
      deletedPlayers = pRes.affectedRows;
    }

    // 8. Delete demo auth tokens, audit logs, user_account, and app_user
    if (userIds.length > 0) {
      await conn.query(
        `DELETE FROM auth_token WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
        userIds
      );
      await conn.query(
        `DELETE FROM audit_log WHERE actor_user_id IN (${userIds.map(() => '?').join(',')})`,
        userIds
      );
    }
    await conn.query('DELETE FROM user_account WHERE email LIKE ?', [emailPattern]);
    const [uRes] = await conn.query('DELETE FROM app_user WHERE email LIKE ?', [emailPattern]);
    deletedUsers = uRes.affectedRows;

    return {
      deletedTournaments,
      deletedPredictions,
      deletedPlayers,
      deletedUsers
    };
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
};

const run = async () => {
  console.log('[reset-demo] Starting safe cleanup of demo data...');
  try {
    const summary = await resetDemo();
    console.log('\n========================================');
    console.log(' Demo Reset Summary');
    console.log('========================================');
    console.table([
      { Entity: 'Tournaments Deleted', Count: summary.deletedTournaments },
      { Entity: 'Predictions Deleted', Count: summary.deletedPredictions },
      { Entity: 'Players Deleted', Count: summary.deletedPlayers },
      { Entity: 'User Accounts Deleted', Count: summary.deletedUsers }
    ]);
    console.log('Demo rows successfully removed. Real data remains intact.\n');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('FATAL: reset-demo failed:', err.message);
    await pool.end();
    process.exit(1);
  }
};

if (process.argv[1]?.endsWith('reset-demo.js')) {
  run();
}
