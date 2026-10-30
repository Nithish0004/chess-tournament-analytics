process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'console';

import bcrypt from 'bcrypt';
import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';
import { getLastGeneratedToken } from '../src/utils/tokens.js';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runTests = async () => {
  console.log('--- Starting Auth & Roles Verification Suite ---');
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Test server running at ${BASE_URL}`);
  });

  const RUN_ID = Date.now();
  const ADMIN_EMAIL = `admin_${RUN_ID}@test.local`;
  const ADMIN_PASS = 'AdminTest123!';
  const PLAYER_EMAIL = `player_${RUN_ID}@test.local`;
  const ORG1_EMAIL = `org1_${RUN_ID}@test.local`;
  const ORG2_EMAIL = `org2_${RUN_ID}@test.local`;
  const LOCKOUT_EMAIL = `lockout_${RUN_ID}@test.local`;
  const RESET_EMAIL = `reset_${RUN_ID}@test.local`;
  const SUSPEND_EMAIL = `suspend_${RUN_ID}@test.local`;

  const results = [];
  const record = (name, passed, details = '') => {
    results.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} - ${name} ${details ? '(' + details + ')' : ''}`);
    if (!passed) {
      console.error(`  -> FAILURE DETAILS: ${details}`);
    }
  };

  let adminUserId = null;
  let adminToken = '';
  let playerToken = '';
  let playerUserId = null;
  let playerId = null;
  let org1Token = '';
  let org1UserId = null;
  let org2Token = '';
  let org2UserId = null;
  let testTournamentId = null;

  try {
    // ---------------------------------------------------------------
    // 1. Health check
    // ---------------------------------------------------------------
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    record('GET /health is public', healthRes.status === 200 && healthJson.status === 'ok');

    // ---------------------------------------------------------------
    // 2. Unauthenticated GET /api/players -> 401
    // ---------------------------------------------------------------
    const unauthPlayersRes = await fetch(`${BASE_URL}/api/players`);
    record('GET /api/players without auth returns 401', unauthPlayersRes.status === 401);

    // ---------------------------------------------------------------
    // 3. Admin user creation & login
    // ---------------------------------------------------------------
    const adminHash = await bcrypt.hash(ADMIN_PASS, 12);
    const [adminInsert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified)
       VALUES (?, ?, 'Test Administrator', 'ADMIN', 'ACTIVE', 1)`,
      [ADMIN_EMAIL, adminHash]
    );
    adminUserId = adminInsert.insertId;

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const adminLoginJson = await adminLoginRes.json();
    adminToken = adminLoginJson.token;
    record('POST /api/auth/login for test admin', adminLoginRes.status === 200 && !!adminToken);

    // Verify GET /api/players works with valid token
    const authPlayersRes = await fetch(`${BASE_URL}/api/players`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('GET /api/players with active user returns 200', authPlayersRes.status === 200);

    // ---------------------------------------------------------------
    // 4. Register -> Verify -> Login (PLAYER)
    // ---------------------------------------------------------------
    const playerRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Test Grandmaster',
        email: PLAYER_EMAIL,
        password: 'PlayerPass123!',
        confirm_password: 'PlayerPass123!',
        accept_terms: true,
        country: 'India',
        date_of_birth: '1995-05-15'
      })
    });
    const playerRegJson = await playerRegRes.json();
    const playerVerifyToken = getLastGeneratedToken();
    record(
      'POST /api/auth/register (PLAYER role)',
      playerRegRes.status === 200 && !!playerVerifyToken,
      playerRegJson.message
    );

    // Unverified login blocked -> 403 EMAIL_NOT_VERIFIED
    const unverifiedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PLAYER_EMAIL, password: 'PlayerPass123!' })
    });
    const unverifiedLoginJson = await unverifiedLoginRes.json();
    record(
      'Unverified login blocked (403 EMAIL_NOT_VERIFIED)',
      unverifiedLoginRes.status === 403 && unverifiedLoginJson.code === 'EMAIL_NOT_VERIFIED'
    );

    // Verify email with token
    const verifyPlayerRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: playerVerifyToken })
    });
    const verifyPlayerJson = await verifyPlayerRes.json();
    record(
      'POST /api/auth/verify-email (PLAYER -> ACTIVE)',
      verifyPlayerRes.status === 200 && verifyPlayerJson.status === 'ACTIVE'
    );

    // Verify token reuse blocked
    const reuseTokenRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: playerVerifyToken })
    });
    record(
      'Used token rejected with 400 INVALID_TOKEN',
      reuseTokenRes.status === 400
    );

    // Login after verification
    const playerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PLAYER_EMAIL, password: 'PlayerPass123!' })
    });
    const playerLoginJson = await playerLoginRes.json();
    playerToken = playerLoginJson.token;
    playerUserId = playerLoginJson.user?.user_id;
    playerId = playerLoginJson.user?.player_id;
    record(
      'POST /api/auth/login after verification returns JWT (8h)',
      playerLoginRes.status === 200 && !!playerToken && !!playerId
    );

    // GET /me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    const meJson = await meRes.json();
    record(
      'GET /api/auth/me returns authenticated user details',
      meRes.status === 200 && meJson.email === PLAYER_EMAIL
    );

    // PUT /me/profile
    const updateProfileRes = await fetch(`${BASE_URL}/api/auth/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`
      },
      body: JSON.stringify({ country: 'USA', full_name: 'Test GM Renamed' })
    });
    record('PUT /api/auth/me/profile updates player profile', updateProfileRes.status === 200);

    // ---------------------------------------------------------------
    // 5. Organizer pending approval then approved
    // ---------------------------------------------------------------
    const org1RegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'ORGANIZER',
        full_name: 'Organizer One',
        email: ORG1_EMAIL,
        password: 'OrgPass123!',
        confirm_password: 'OrgPass123!',
        accept_terms: true,
        organization: 'World Chess Tour',
        phone: '+1234567890'
      })
    });
    const org1VerifyToken = getLastGeneratedToken();
    record('POST /api/auth/register (ORGANIZER role)', org1RegRes.status === 200 && !!org1VerifyToken);

    // Verify organizer email -> PENDING_APPROVAL
    const verifyOrg1Res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: org1VerifyToken })
    });
    const verifyOrg1Json = await verifyOrg1Res.json();
    record(
      'POST /api/auth/verify-email (ORGANIZER -> PENDING_APPROVAL)',
      verifyOrg1Res.status === 200 && verifyOrg1Json.status === 'PENDING_APPROVAL'
    );

    // Organizer login blocked before admin approval
    const org1PendingLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ORG1_EMAIL, password: 'OrgPass123!' })
    });
    const org1PendingJson = await org1PendingLoginRes.json();
    record(
      'Organizer pending approval login blocked (403 PENDING_APPROVAL)',
      org1PendingLoginRes.status === 403 && org1PendingJson.code === 'PENDING_APPROVAL'
    );

    // Admin lists pending organizers: GET /api/admin/users?status=PENDING_APPROVAL&role=ORGANIZER
    const adminGetUsersRes = await fetch(
      `${BASE_URL}/api/admin/users?status=PENDING_APPROVAL&role=ORGANIZER`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const adminGetUsersJson = await adminGetUsersRes.json();
    const org1User = adminGetUsersJson.find(u => u.email === ORG1_EMAIL);
    org1UserId = org1User?.user_id;
    record(
      'GET /api/admin/users?status=...&role=... lists pending organizer',
      adminGetUsersRes.status === 200 && !!org1UserId
    );

    // Admin approves organizer
    const approveRes = await fetch(`${BASE_URL}/api/admin/users/${org1UserId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(
      'POST /api/admin/users/:id/approve approves organizer',
      approveRes.status === 200
    );

    // Organizer logs in after approval
    const org1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ORG1_EMAIL, password: 'OrgPass123!' })
    });
    const org1LoginJson = await org1LoginRes.json();
    org1Token = org1LoginJson.token;
    record('Organizer login successful after approval', org1LoginRes.status === 200 && !!org1Token);

    // ---------------------------------------------------------------
    // 6. Setup Organizer 2 (for cross-organizer tournament testing)
    // ---------------------------------------------------------------
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'ORGANIZER',
        full_name: 'Organizer Two',
        email: ORG2_EMAIL,
        password: 'OrgPass123!',
        confirm_password: 'OrgPass123!',
        accept_terms: true,
        organization: 'Metro Chess League',
        phone: '+9876543210'
      })
    });
    const org2VerifyToken = getLastGeneratedToken();
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: org2VerifyToken })
    });

    const [org2DbRows] = await pool.query('SELECT user_id FROM app_user WHERE email = ?', [ORG2_EMAIL]);
    org2UserId = org2DbRows[0].user_id;
    await fetch(`${BASE_URL}/api/admin/users/${org2UserId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const org2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ORG2_EMAIL, password: 'OrgPass123!' })
    });
    const org2LoginJson = await org2LoginRes.json();
    org2Token = org2LoginJson.token;

    // ---------------------------------------------------------------
    // 7. Role Authorization: Player blocked from POST /api/tournaments (403)
    // ---------------------------------------------------------------
    const playerCreateTournamentRes = await fetch(`${BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`
      },
      body: JSON.stringify({
        name: 'Player Illegal Tournament',
        format: 'ROUND_ROBIN',
        start_date: '2026-11-10',
        end_date: '2026-11-15'
      })
    });
    record(
      'Player blocked from POST /api/tournaments (403)',
      playerCreateTournamentRes.status === 403
    );

    // ---------------------------------------------------------------
    // 8. Organizer creates tournament (sets tournament.created_by)
    // ---------------------------------------------------------------
    const orgCreateTournamentRes = await fetch(`${BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`
      },
      body: JSON.stringify({
        name: `Org1 Championship ${RUN_ID}`,
        format: 'ROUND_ROBIN',
        start_date: '2026-11-10',
        end_date: '2026-11-15',
        status: 'UPCOMING'
      })
    });
    const orgCreateTournamentJson = await orgCreateTournamentRes.json();
    testTournamentId = orgCreateTournamentJson.tournament_id;
    record(
      'Organizer creates tournament with created_by',
      orgCreateTournamentRes.status === 201 && orgCreateTournamentJson.created_by === org1UserId,
      `id: ${testTournamentId}, created_by: ${orgCreateTournamentJson.created_by}`
    );

    // ---------------------------------------------------------------
    // 9. Organizer blocked from another organizer's tournament (403)
    // ---------------------------------------------------------------
    const org2EditRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org2Token}`
      },
      body: JSON.stringify({ name: 'Hacked Tournament Name' })
    });
    record(
      'Organizer blocked from editing another organizer tournament (403)',
      org2EditRes.status === 403
    );

    const org2CreateRoundRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/rounds`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org2Token}` }
    });
    record(
      'Organizer blocked from creating rounds in another organizer tournament (403)',
      org2CreateRoundRes.status === 403
    );

    // ---------------------------------------------------------------
    // 10. Player self-registration: POST /api/tournaments/:id/register-me
    // ---------------------------------------------------------------
    const registerMeRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/register-me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    const registerMeJson = await registerMeRes.json();
    record(
      'Player self-registers via POST /api/tournaments/:id/register-me',
      registerMeRes.status === 201 && registerMeJson.registration?.player_id === playerId
    );

    // Player duplicate self-registration blocked
    const duplicateRegMeRes = await fetch(`${BASE_URL}/api/tournaments/${testTournamentId}/register-me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    record(
      'Duplicate self-registration rejected with 400',
      duplicateRegMeRes.status === 400
    );

    // Player blocked from updating other players' profiles
    const playerEditOtherRes = await fetch(`${BASE_URL}/api/players/999999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`
      },
      body: JSON.stringify({ country: 'France' })
    });
    record(
      'Player blocked from modifying other player profiles (403)',
      playerEditOtherRes.status === 403
    );

    // ---------------------------------------------------------------
    // 11. Wrong password lockout (5 attempts -> 429)
    // ---------------------------------------------------------------
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Lockout User',
        email: LOCKOUT_EMAIL,
        password: 'CorrectPass123!',
        confirm_password: 'CorrectPass123!',
        accept_terms: true
      })
    });
    const lockoutVerifyToken = getLastGeneratedToken();
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: lockoutVerifyToken })
    });

    // 4 wrong attempts
    for (let i = 1; i <= 4; i++) {
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: LOCKOUT_EMAIL, password: 'WrongPassword!' })
      });
    }

    // 5th wrong attempt triggers lockout
    const attempt5Res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOCKOUT_EMAIL, password: 'WrongPassword!' })
    });
    record('5th failed password attempt returns 401', attempt5Res.status === 401);

    // 6th attempt with correct password returns 429
    const attempt6Res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOCKOUT_EMAIL, password: 'CorrectPass123!' })
    });
    const attempt6Json = await attempt6Res.json();
    record(
      'Locked account returns 429 after 5 failed attempts',
      attempt6Res.status === 429 && attempt6Json.code === 'LOCKED'
    );

    // ---------------------------------------------------------------
    // 12. Forgot / Reset Password flow
    // ---------------------------------------------------------------
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Reset Test User',
        email: RESET_EMAIL,
        password: 'OldPassword123!',
        confirm_password: 'OldPassword123!',
        accept_terms: true
      })
    });
    const resetUserVerifyToken = getLastGeneratedToken();
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetUserVerifyToken })
    });

    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: RESET_EMAIL })
    });
    const resetToken = getLastGeneratedToken();
    record('POST /api/auth/forgot-password sends reset token', forgotRes.status === 200 && !!resetToken);

    const resetPassRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: 'NewPassword123!',
        confirm_password: 'NewPassword123!'
      })
    });
    record('POST /api/auth/reset-password updates password', resetPassRes.status === 200);

    // Login with old password fails
    const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: RESET_EMAIL, password: 'OldPassword123!' })
    });
    record('Login with old password fails (401)', oldLoginRes.status === 401);

    // Login with new password succeeds
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: RESET_EMAIL, password: 'NewPassword123!' })
    });
    record('Login with new password succeeds (200)', newLoginRes.status === 200);

    // ---------------------------------------------------------------
    // 13. Suspended user blocked
    // ---------------------------------------------------------------
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Suspend Target',
        email: SUSPEND_EMAIL,
        password: 'SuspendPass123!',
        confirm_password: 'SuspendPass123!',
        accept_terms: true
      })
    });
    const suspendVerifyToken = getLastGeneratedToken();
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: suspendVerifyToken })
    });

    const suspendLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SUSPEND_EMAIL, password: 'SuspendPass123!' })
    });
    const suspendLoginJson = await suspendLoginRes.json();
    const suspendUserToken = suspendLoginJson.token;
    const suspendUserId = suspendLoginJson.user.user_id;

    // Admin suspends user
    const suspendRes = await fetch(`${BASE_URL}/api/admin/users/${suspendUserId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Admin suspends user', suspendRes.status === 200);

    // Existing token immediately blocked by database recheck
    const blockedTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${suspendUserToken}` }
    });
    record(
      'Suspended user blocked on subsequent API call with token (403)',
      blockedTokenRes.status === 403
    );

    // Suspended user blocked from logging in
    const blockedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SUSPEND_EMAIL, password: 'SuspendPass123!' })
    });
    record(
      'Suspended user blocked on login (403 SUSPENDED)',
      blockedLoginRes.status === 403
    );

    // Admin cannot suspend themselves
    const adminSelfSuspendRes = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Admin cannot suspend themselves (400)', adminSelfSuspendRes.status === 400);

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    console.log('\n--- Cleaning up test records to preserve demo data ---');
    try {
      // Clean up test tournaments and registrations
      await pool.query(
        `DELETE FROM registration WHERE player_id IN (
          SELECT player_id FROM player WHERE email LIKE '%@test.local'
        ) OR tournament_id IN (
          SELECT tournament_id FROM tournament WHERE created_by IN (
            SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
          )
        )`
      );
      await pool.query(
        `DELETE FROM tournament_round WHERE tournament_id IN (
          SELECT tournament_id FROM tournament WHERE created_by IN (
            SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
          )
        )`
      );
      await pool.query(
        `DELETE FROM tournament WHERE created_by IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );
      // Clean up tokens
      await pool.query(
        `DELETE FROM auth_token WHERE user_id IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );
      // Clean up app_user rows
      await pool.query("DELETE FROM app_user WHERE email LIKE '%@test.local'");
      await pool.query("DELETE FROM app_user WHERE email = 'admin@chess.local'");
      // Clean up player rows
      await pool.query("DELETE FROM player WHERE email LIKE '%@test.local'");
      console.log('Test records successfully cleaned up.');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr.message);
    }

    server.close();
    await pool.end();

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\nVerification complete: ${passedCount}/${totalCount} tests passed.`);
    if (passedCount !== totalCount) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
};

runTests();
