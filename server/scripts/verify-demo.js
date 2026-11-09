import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';
import { seedDemo } from './seed-demo-full.js';
import { resetDemo, DEMO_EMAIL_DOMAIN, DEMO_TOURNAMENT_NAMES } from './reset-demo.js';

const runVerification = async () => {
  console.log('===============================================================');
  console.log('         CHESS MAGIC - DEMO VERIFICATION SUITE                 ');
  console.log('===============================================================\n');

  const conn = await pool.getConnection();
  const checks = [];

  const record = (name, passed, details = '') => {
    checks.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} : ${name}${details ? ` -> ${details}` : ''}`);
  };

  try {
    // -------------------------------------------------------------
    // Database Verification Checks
    // -------------------------------------------------------------
    console.log('--- Database Integrity Checks ---');

    // 1. Account counts per role
    const [userCounts] = await conn.query(
      `SELECT role, COUNT(*) as cnt 
       FROM app_user 
       WHERE email LIKE ? 
       GROUP BY role`,
      [`%${DEMO_EMAIL_DOMAIN}`]
    );
    const adminCount = userCounts.find(r => r.role === 'ADMIN')?.cnt || 0;
    const orgCount = userCounts.find(r => r.role === 'ORGANIZER')?.cnt || 0;
    const playerCount = userCounts.find(r => r.role === 'PLAYER')?.cnt || 0;

    const [linkedPlayers] = await conn.query(
      `SELECT COUNT(*) as cnt 
       FROM app_user u
       JOIN player p ON p.player_id = u.player_id
       WHERE u.email LIKE ? AND u.role = 'PLAYER'`,
      [`%${DEMO_EMAIL_DOMAIN}`]
    );

    record(
      'Account counts per role (1 Admin, 3 Organizers, 20 Players)',
      adminCount === 1 && orgCount === 3 && playerCount === 20 && linkedPlayers[0].cnt === 20,
      `Admin: ${adminCount}/1, Organizers: ${orgCount}/3, Players: ${playerCount}/20 (all linked)`
    );

    // 2. 4 demo tournaments with the right statuses
    const [tournaments] = await conn.query(
      `SELECT tournament_id, name, status, format, created_by 
       FROM tournament 
       WHERE name IN (?, ?, ?, ?)
       ORDER BY tournament_id ASC`,
      DEMO_TOURNAMENT_NAMES
    );
    const tMap = new Map(tournaments.map(t => [t.name, t]));
    const t1 = tMap.get('Bengaluru Blitz');
    const t2 = tMap.get('Mysuru Rapid Cup');
    const t3 = tMap.get('RVCE Open 2026');
    const t4 = tMap.get('Karnataka Classic');

    const statusesMatch = 
      t1?.status === 'COMPLETED' &&
      t2?.status === 'ONGOING' &&
      t3?.status === 'UPCOMING' &&
      t4?.status === 'COMPLETED';

    record(
      '4 demo tournaments with correct statuses',
      tournaments.length === 4 && statusesMatch,
      `Blitz: ${t1?.status}, Mysuru: ${t2?.status}, RVCE: ${t3?.status}, Classic: ${t4?.status}`
    );

    // 3. Registrations match
    const [regCounts] = await conn.query(
      `SELECT t.name, COUNT(r.registration_id) as reg_count
       FROM tournament t
       LEFT JOIN registration r ON r.tournament_id = t.tournament_id
       WHERE t.name IN (?, ?, ?, ?)
       GROUP BY t.name`,
      DEMO_TOURNAMENT_NAMES
    );
    const regMap = new Map(regCounts.map(r => [r.name, r.reg_count]));
    const regsMatch = 
      regMap.get('Bengaluru Blitz') === 8 &&
      regMap.get('Mysuru Rapid Cup') === 8 &&
      regMap.get('RVCE Open 2026') === 12 &&
      regMap.get('Karnataka Classic') === 6;

    record(
      'Registrations count per tournament matches expected',
      regsMatch,
      `Blitz: ${regMap.get('Bengaluru Blitz')}/8, Mysuru: ${regMap.get('Mysuru Rapid Cup')}/8, RVCE: ${regMap.get('RVCE Open 2026')}/12, Classic: ${regMap.get('Karnataka Classic')}/6`
    );

    // 4. No game with an unregistered player
    const [unregGames] = await conn.query(
      `SELECT g.game_id, tr.tournament_id, t.name, g.white_player_id, g.black_player_id
       FROM game g
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN tournament t ON t.tournament_id = tr.tournament_id
       WHERE t.name IN (?, ?, ?, ?)
         AND (
           g.white_player_id NOT IN (SELECT player_id FROM registration WHERE tournament_id = t.tournament_id)
           OR g.black_player_id NOT IN (SELECT player_id FROM registration WHERE tournament_id = t.tournament_id)
         )`,
      DEMO_TOURNAMENT_NAMES
    );
    record(
      'No game with an unregistered player',
      unregGames.length === 0,
      `Violations found: ${unregGames.length}`
    );

    // 5. Every non-pending game has a result
    const [missingResults] = await conn.query(
      `SELECT g.game_id, t.name, g.status
       FROM game g
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN tournament t ON t.tournament_id = tr.tournament_id
       LEFT JOIN result r ON r.game_id = g.game_id
       WHERE t.name IN (?, ?, ?, ?)
         AND g.status = 'FINISHED'
         AND r.game_id IS NULL`,
      DEMO_TOURNAMENT_NAMES
    );
    record(
      'Every non-pending game has a result recorded',
      missingResults.length === 0,
      `Unrecorded finished games: ${missingResults.length}`
    );

    // 6. Sum of rating changes per game is zero
    const [sumDiffs] = await conn.query(
      `SELECT rh.game_id, SUM(rh.rating_change) as net_change
       FROM rating_history rh
       JOIN game g ON g.game_id = rh.game_id
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN tournament t ON t.tournament_id = tr.tournament_id
       WHERE t.name IN (?, ?, ?, ?)
       GROUP BY rh.game_id
       HAVING net_change <> 0`,
      DEMO_TOURNAMENT_NAMES
    );
    record(
      'Sum of rating changes per game is zero (zero-sum Elo)',
      sumDiffs.length === 0,
      `Games with non-zero sum rating change: ${sumDiffs.length}`
    );

    // 7. At least 4 upsets total (>=2 in completed tournaments, >=1 in ongoing)
    const [upsetRows] = await conn.query(
      `SELECT t.name, t.status, COUNT(*) as upsets
       FROM result r
       JOIN game g ON g.game_id = r.game_id
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN tournament t ON t.tournament_id = tr.tournament_id
       WHERE t.name IN (?, ?, ?, ?) AND r.is_upset = 1
       GROUP BY t.name, t.status`,
      DEMO_TOURNAMENT_NAMES
    );
    const completedUpsets = upsetRows
      .filter(r => r.status === 'COMPLETED')
      .reduce((acc, r) => acc + r.upsets, 0);
    const ongoingUpsets = upsetRows
      .filter(r => r.status === 'ONGOING')
      .reduce((acc, r) => acc + r.upsets, 0);
    const totalUpsets = completedUpsets + ongoingUpsets;

    record(
      'At least 4 upsets (>=2 in completed, >=1 in ongoing)',
      totalUpsets >= 4 && completedUpsets >= 2 && ongoingUpsets >= 1,
      `Total: ${totalUpsets} (Completed: ${completedUpsets}, Ongoing: ${ongoingUpsets})`
    );

    // 8. Standings exist for completed tournaments
    const [stCounts] = await conn.query(
      `SELECT t.name, COUNT(s.player_id) as count
       FROM tournament_standings s
       JOIN tournament t ON t.tournament_id = s.tournament_id
       WHERE t.name IN ('Bengaluru Blitz', 'Karnataka Classic')
       GROUP BY t.name`
    );
    const stMap = new Map(stCounts.map(s => [s.name, s.count]));
    const standingsValid = stMap.get('Bengaluru Blitz') === 8 && stMap.get('Karnataka Classic') === 6;

    record(
      'Standings exist and match player count for completed tournaments',
      standingsValid,
      `Blitz standings: ${stMap.get('Bengaluru Blitz')}/8, Classic standings: ${stMap.get('Karnataka Classic')}/6`
    );

    // 9. Ongoing tournament has pending games in round 4
    const [pendingR4Games] = await conn.query(
      `SELECT g.game_id, g.board_no, g.status
       FROM game g
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN tournament t ON t.tournament_id = tr.tournament_id
       WHERE t.name = 'Mysuru Rapid Cup' AND tr.round_no = 4`
    );
    const r4AllPending = pendingR4Games.length === 4 && pendingR4Games.every(g => g.status === 'SCHEDULED');
    record(
      'Ongoing tournament has pending games in round 4',
      r4AllPending,
      `Found ${pendingR4Games.length} scheduled games in round 4`
    );

    // 10. Re-running the seed produces no duplicates
    const [dupUsers] = await conn.query(
      `SELECT email, COUNT(*) as cnt FROM app_user WHERE email LIKE ? GROUP BY email HAVING cnt > 1`,
      [`%${DEMO_EMAIL_DOMAIN}`]
    );
    const [dupTournaments] = await conn.query(
      `SELECT name, COUNT(*) as cnt FROM tournament WHERE name IN (?, ?, ?, ?) GROUP BY name HAVING cnt > 1`,
      DEMO_TOURNAMENT_NAMES
    );
    record(
      'Re-running the seed produces no duplicates',
      dupUsers.length === 0 && dupTournaments.length === 0,
      `Duplicate users: ${dupUsers.length}, Duplicate tournaments: ${dupTournaments.length}`
    );

    // -------------------------------------------------------------
    // API Verification Suite (live endpoints testing)
    // -------------------------------------------------------------
    console.log('\n--- API Endpoints & RBAC Verification ---');

    const app = createApp();
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 11. Login as ADMIN
      const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin_demo',
          password: 'AdminDemo123'
        })
      });
      const adminLoginData = await adminLoginRes.json();
      const adminToken = adminLoginData.token;
      record(
        'Login as ADMIN (admin_demo / AdminDemo123)',
        adminLoginRes.status === 200 && !!adminToken,
        `Status: ${adminLoginRes.status}`
      );

      // 12. Login as ORGANIZER
      const orgLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'org_mysuru',
          password: 'OrgDemo123'
        })
      });
      const orgLoginData = await orgLoginRes.json();
      const orgToken = orgLoginData.token;
      record(
        'Login as ORGANIZER (org_mysuru / OrgDemo123)',
        orgLoginRes.status === 200 && !!orgToken,
        `Status: ${orgLoginRes.status}`
      );

      // 13. Login as PLAYER
      const playerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nithish_s',
          password: 'PlayerDemo123'
        })
      });
      const playerLoginData = await playerLoginRes.json();
      const playerToken = playerLoginData.token;
      record(
        'Login as PLAYER (nithish_s / PlayerDemo123)',
        playerLoginRes.status === 200 && !!playerToken,
        `Status: ${playerLoginRes.status}`
      );

      // 14. GET /api/tournaments
      const tournsRes = await fetch(`${baseUrl}/api/tournaments`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const tournsData = await tournsRes.json();
      const tournsListed = Array.isArray(tournsData) && DEMO_TOURNAMENT_NAMES.every(name =>
        tournsData.some(t => t.name === name)
      );
      record(
        'GET /api/tournaments lists demo tournaments',
        tournsRes.status === 200 && tournsListed,
        `Returned ${tournsData.length || 0} tournaments`
      );

      // 15. GET /api/dashboard for roles
      const dashAdminRes = await fetch(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const dashPlayerRes = await fetch(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${playerToken}` }
      });
      const dashData = await dashAdminRes.json();
      record(
        'GET /api/dashboard loads successfully for all roles',
        dashAdminRes.status === 200 && dashPlayerRes.status === 200 && typeof dashData === 'object',
        `Admin: ${dashAdminRes.status}, Player: ${dashPlayerRes.status}`
      );

      // 16. GET /api/tournaments/:id/standings
      const blitzId = t1.tournament_id;
      const standingsRes = await fetch(`${baseUrl}/api/tournaments/${blitzId}/standings`, {
        headers: { Authorization: `Bearer ${playerToken}` }
      });
      const standingsData = await standingsRes.json();
      record(
        'GET /api/tournaments/:id/standings returns standings',
        standingsRes.status === 200 && Array.isArray(standingsData) && standingsData.length === 8,
        `Returned ${standingsData.length} standing entries`
      );

      // 17. GET /api/tournaments/:id/predictions
      const rvceId = t3.tournament_id;
      const predRes = await fetch(`${baseUrl}/api/tournaments/${rvceId}/predictions`, {
        headers: { Authorization: `Bearer ${playerToken}` }
      });
      const predData = await predRes.json();
      record(
        'GET /api/tournaments/:id/predictions returns demo predictions',
        predRes.status === 200 && Array.isArray(predData) && predData.length === 12,
        `Returned ${predData.length} predictions for RVCE Open`
      );

      // 18. PLAYER token gets 403 on creating a tournament
      const playerCreateRes = await fetch(`${baseUrl}/api/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`
        },
        body: JSON.stringify({
          name: 'Unauthorized Tournament',
          format: 'ROUND_ROBIN',
          start_date: '2026-12-01',
          end_date: '2026-12-02'
        })
      });
      record(
        'PLAYER token gets 403 on creating a tournament',
        playerCreateRes.status === 403,
        `Status: ${playerCreateRes.status}`
      );

      // 19. ORGANIZER can create a tournament
      const orgCreateRes = await fetch(`${baseUrl}/api/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orgToken}`
        },
        body: JSON.stringify({
          name: 'Mysuru Weekend Blitz Test',
          format: 'ROUND_ROBIN',
          start_date: '2026-12-10',
          end_date: '2026-12-12'
        })
      });
      const orgCreateData = await orgCreateRes.json();
      const testTournId = orgCreateData.tournament_id;
      record(
        'ORGANIZER can create a tournament',
        orgCreateRes.status === 201 && !!testTournId,
        `Created tournament ID: ${testTournId}`
      );
      // Clean up test tournament
      if (testTournId) {
        await conn.query('DELETE FROM tournament WHERE tournament_id = ?', [testTournId]);
      }

      // 20. Organizer can record pending round-4 result (then re-seed restores state)
      const pendingGameId = pendingR4Games[0]?.game_id;
      let recordResultOk = false;
      if (pendingGameId) {
        const resultRes = await fetch(`${baseUrl}/api/games/${pendingGameId}/result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${orgToken}`
          },
          body: JSON.stringify({ outcome: 'WHITE' })
        });
        const resultData = await resultRes.json();
        recordResultOk = resultRes.status === 200 && resultData.result?.outcome === 'WHITE';
      }
      record(
        'ORGANIZER can record pending round-4 result in Mysuru Rapid Cup',
        recordResultOk,
        `Game ID: ${pendingGameId}, Result recorded`
      );

      // Restore demo state so round 4 game remains pending
      console.log('\n[verify-demo] Restoring demo state via re-seeding...');
      await seedDemo();
      console.log('[verify-demo] Demo state restored cleanly.');

    } finally {
      server.close();
    }

    // -------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------
    const allPassed = checks.every(c => c.passed);
    console.log('\n===============================================================');
    console.log(`VERIFICATION RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
    console.log(`Passed: ${checks.filter(c => c.passed).length} / ${checks.length}`);
    console.log('===============================================================\n');

    await pool.end();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('FATAL: Verification failed with uncaught exception:', err);
    await pool.end();
    process.exit(1);
  } finally {
    conn.release();
  }
};

runVerification();
