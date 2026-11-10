process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'console';

import bcrypt from 'bcrypt';
import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';
import { getLastGeneratedToken } from '../src/utils/tokens.js';

const PORT = 5056;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runTests = async () => {
  console.log('======================================================================');
  console.log('--- Account Approval Flow & RBAC Comprehensive Verification Suite ---');
  console.log('======================================================================\n');

  // Safety confirmation
  const [dbCheck] = await pool.query('SELECT DATABASE() AS current_db');
  const currentDb = dbCheck[0]?.current_db;
  console.log(`[Safety Check] Confirmed database in use: ${currentDb}`);
  if (currentDb !== 'chess_scratch') {
    console.error(`FATAL: test-approval-flow must ONLY run against 'chess_scratch'! Current DB: ${currentDb}`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Test server running at ${BASE_URL}\n`);
  });

  const RUN_ID = Date.now();
  const results = [];
  const record = (name, passed, details = '') => {
    results.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} - ${name} ${details ? '(' + details + ')' : ''}`);
    if (!passed) {
      console.error(`  -> FAILURE DETAILS: ${details}`);
    }
  };

  try {
    // -----------------------------------------------------------------
    // Setup Admin Account
    // -----------------------------------------------------------------
    const ADMIN_EMAIL = `admin_flow_${RUN_ID}@test.local`;
    const ADMIN_PASS = 'AdminPass123!';
    const adminHash = await bcrypt.hash(ADMIN_PASS, 12);
    const [adminInsert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, approval_status)
       VALUES (?, ?, 'Flow Administrator', 'ADMIN', 'ACTIVE', 1, 'APPROVED')`,
      [ADMIN_EMAIL, adminHash]
    );
    const adminUserId = adminInsert.insertId;

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.token;
    record('Admin setup & login returns APPROVED status', adminLoginJson.user?.approval_status === 'APPROVED');

    // -----------------------------------------------------------------
    // 1. Registration Field Validation for Both Roles
    // -----------------------------------------------------------------
    console.log('\n--- 1. Registration Field Validation for Both Roles ---');

    // 1.1 Player: Missing dob
    const pNoDobRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'No Dob Player',
        email: `nodob_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        gender: 'MALE',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    record('Player registration without date_of_birth rejected (400)', pNoDobRes.status === 400);

    // 1.2 Player: Future dob
    const pFutureDobRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Future Dob Player',
        email: `futuredob_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: '2099-01-01',
        gender: 'MALE',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    record('Player registration with future date_of_birth rejected (400)', pFutureDobRes.status === 400);

    // 1.3 Player: Age < 5
    const now = new Date();
    const age2Date = `${now.getFullYear() - 2}-01-01`;
    const pTooYoungRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Young Player',
        email: `young_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: age2Date,
        gender: 'MALE',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    record('Player registration with age < 5 rejected (400)', pTooYoungRes.status === 400);

    // 1.4 Player: Missing gender
    const pNoGenderRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'No Gender Player',
        email: `nogender_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: '1995-01-01',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    record('Player registration without gender rejected (400)', pNoGenderRes.status === 400);

    // 1.5 Player: Missing experience_level
    const pNoExpRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'No Exp Player',
        email: `noexp_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: '1995-01-01',
        gender: 'FEMALE',
        accept_terms: true
      })
    });
    record('Player registration without experience_level rejected (400)', pNoExpRes.status === 400);

    // 1.6 Player: Valid Registration
    const VALID_PLAYER_EMAIL = `valid_player_${RUN_ID}@test.local`;
    const VALID_PLAYER_PASS = 'PlayerPass123!';
    const pValidRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Valid Test Player',
        email: VALID_PLAYER_EMAIL,
        password: VALID_PLAYER_PASS,
        confirm_password: VALID_PLAYER_PASS,
        date_of_birth: '1996-04-12',
        gender: 'FEMALE',
        phone: '+15551234567',
        country: 'India',
        experience_level: 'INTERMEDIATE',
        club: 'Royal Chess Club',
        fide_id: `FIDE_${RUN_ID.toString().slice(-6)}`,
        accept_terms: true
      })
    });
    const playerVerifyToken = getLastGeneratedToken();
    record('Valid Player registration returns 200', pValidRes.status === 200);

    // Verify DB state: linked player row, rating 1200, status PENDING_EMAIL, approval PENDING, phone in app_user
    const [dbPlayerUsers] = await pool.query(
      'SELECT user_id, email, status, approval_status, phone, player_id FROM app_user WHERE email = ?',
      [VALID_PLAYER_EMAIL]
    );
    const playerUser = dbPlayerUsers[0];
    const [dbPlayerRows] = await pool.query(
      'SELECT player_id, name, current_rating, gender, experience_level, club, fide_id FROM player WHERE player_id = ?',
      [playerUser?.player_id]
    );
    const playerRecord = dbPlayerRows[0];

    record(
      'Player registration creates app_user (PENDING_EMAIL, PENDING, phone stored) and linked player (rating 1200, profile)',
      playerUser?.status === 'PENDING_EMAIL' &&
      playerUser?.approval_status === 'PENDING' &&
      playerUser?.phone === '+15551234567' &&
      playerRecord?.current_rating === 1200 &&
      playerRecord?.gender === 'FEMALE' &&
      playerRecord?.experience_level === 'INTERMEDIATE'
    );

    // 1.7 Organizer: Missing phone
    const oNoPhoneRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'ORGANIZER',
        full_name: 'No Phone Organizer',
        email: `nophone_org_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        organization: 'Chess Club',
        country: 'India',
        accept_terms: true
      })
    });
    record('Organizer registration without phone rejected (400)', oNoPhoneRes.status === 400);

    // 1.8 Organizer: Missing organization
    const oNoOrgRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'ORGANIZER',
        full_name: 'No Org Organizer',
        email: `noorg_${RUN_ID}@test.local`,
        password: 'Password123!',
        confirm_password: 'Password123!',
        phone: '+15550001111',
        country: 'India',
        accept_terms: true
      })
    });
    record('Organizer registration without organization rejected (400)', oNoOrgRes.status === 400);

    // 1.9 Organizer: Valid Registration
    const VALID_ORG_EMAIL = `valid_org_${RUN_ID}@test.local`;
    const VALID_ORG_PASS = 'OrganizerPass123!';
    const oValidRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'ORGANIZER',
        full_name: 'Valid Test Organizer',
        email: VALID_ORG_EMAIL,
        password: VALID_ORG_PASS,
        confirm_password: VALID_ORG_PASS,
        phone: '+15558889999',
        organization: 'Grandmaster Association',
        country: 'India',
        accept_terms: true
      })
    });
    const orgVerifyToken = getLastGeneratedToken();
    record('Valid Organizer registration returns 200', oValidRes.status === 200);

    const [dbOrgUsers] = await pool.query(
      'SELECT user_id, email, status, approval_status, phone, organization FROM app_user WHERE email = ?',
      [VALID_ORG_EMAIL]
    );
    const orgUser = dbOrgUsers[0];
    record(
      'Organizer registration creates app_user with status PENDING_EMAIL, approval PENDING, phone & organization stored',
      orgUser?.status === 'PENDING_EMAIL' &&
      orgUser?.approval_status === 'PENDING' &&
      orgUser?.phone === '+15558889999' &&
      orgUser?.organization === 'Grandmaster Association'
    );

    // -----------------------------------------------------------------
    // 2. Email Verification & Verified-but-unapproved Player Permissions
    // -----------------------------------------------------------------
    console.log('\n--- 2. Verified-but-unapproved Player Access ---');

    // Verify player email using captured token
    const pVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: playerVerifyToken })
    });
    record('Player email verification returns 200', pVerifyRes.status === 200);

    const [dbPlayerAfterVerify] = await pool.query(
      'SELECT status, approval_status FROM app_user WHERE email = ?',
      [VALID_PLAYER_EMAIL]
    );
    record(
      'Email verified sets status ACTIVE while approval_status remains PENDING',
      dbPlayerAfterVerify[0]?.status === 'ACTIVE' && dbPlayerAfterVerify[0]?.approval_status === 'PENDING'
    );

    // Player logs in
    const playerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_PLAYER_EMAIL, password: VALID_PLAYER_PASS })
    });
    const playerLoginJson = await playerLoginRes.json();
    const playerToken = playerLoginJson.token;
    record(
      'Verified-but-unapproved player can log in, receives PENDING approval_status and correct permissions',
      playerLoginRes.status === 200 &&
      playerLoginJson.approval_status === 'PENDING' &&
      playerLoginJson.permissions?.can_explore === true &&
      playerLoginJson.permissions?.can_join_tournaments === false &&
      playerLoginJson.permissions?.can_create_tournaments === false
    );

    // Unapproved player can explore (GET /api/tournaments)
    const exploreRes = await fetch(`${BASE_URL}/api/tournaments`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    record('Unapproved player can explore public tournament listings (200)', exploreRes.status === 200);

    // Create an existing tournament for registration testing
    const [tUpcomingRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'SWISS', '2026-11-20', '2026-11-25', 'UPCOMING', ?)`,
      [`Upcoming Tourney ${RUN_ID}`, adminUserId]
    );
    const upcomingTourneyId = tUpcomingRes.insertId;

    // Unapproved player attempts to join -> 403 NOT_APPROVED
    const pJoinRes = await fetch(`${BASE_URL}/api/tournaments/${upcomingTourneyId}/register-me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    const pJoinJson = await pJoinRes.json();
    record(
      'Unapproved player gets 403 NOT_APPROVED on register-me',
      pJoinRes.status === 403 && pJoinJson.code === 'NOT_APPROVED'
    );

    // -----------------------------------------------------------------
    // 3. Unapproved Organizer gets 403 on Creating a Tournament
    // -----------------------------------------------------------------
    console.log('\n--- 3. Unapproved Organizer Access Gate ---');

    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: orgVerifyToken })
    });

    const orgLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_ORG_EMAIL, password: VALID_ORG_PASS })
    });
    const orgLoginJson = await orgLoginRes.json();
    const orgToken = orgLoginJson.token;
    record(
      'Verified-but-unapproved organizer logs in with PENDING approval and can_create_tournaments=false',
      orgLoginRes.status === 200 &&
      orgLoginJson.approval_status === 'PENDING' &&
      orgLoginJson.permissions?.can_create_tournaments === false
    );

    // Unapproved organizer attempts to create tournament -> 403 NOT_APPROVED
    const oCreateRes = await fetch(`${BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgToken}`
      },
      body: JSON.stringify({
        name: `Blocked Tourney ${RUN_ID}`,
        format: 'ROUND_ROBIN',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        status: 'UPCOMING'
      })
    });
    const oCreateJson = await oCreateRes.json();
    record(
      'Unapproved organizer gets 403 NOT_APPROVED on creating tournament',
      oCreateRes.status === 403 && oCreateJson.code === 'NOT_APPROVED'
    );

    // -----------------------------------------------------------------
    // 4. Admin Approval Changes Both
    // -----------------------------------------------------------------
    console.log('\n--- 4. Admin Approval Unlocks Capabilities ---');

    // Admin approves organizer
    const approveOrgRes = await fetch(`${BASE_URL}/api/admin/users/${orgUser.user_id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Admin approves organizer (200)', approveOrgRes.status === 200);

    // Approved organizer can now create a tournament
    const oCreateApprovedRes = await fetch(`${BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgToken}`
      },
      body: JSON.stringify({
        name: `Approved Org Tourney ${RUN_ID}`,
        format: 'ROUND_ROBIN',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        status: 'UPCOMING'
      })
    });
    const oCreateApprovedJson = await oCreateApprovedRes.json();
    const orgCreatedTourneyId = oCreateApprovedJson.tournament_id;
    record('Approved organizer successfully creates tournament (201)', oCreateApprovedRes.status === 201 && !!orgCreatedTourneyId);

    // Admin approves player
    const approvePlayerRes = await fetch(`${BASE_URL}/api/admin/users/${playerUser.user_id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Admin approves player (200)', approvePlayerRes.status === 200);

    // Approved player can now register-me
    const pJoinApprovedRes = await fetch(`${BASE_URL}/api/tournaments/${upcomingTourneyId}/register-me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    record('Approved player successfully joins tournament with register-me (201)', pJoinApprovedRes.status === 201);

    // -----------------------------------------------------------------
    // 5. Starting Rating Applied ONLY Before First Game
    // -----------------------------------------------------------------
    console.log('\n--- 5. Starting Rating Applied ONLY Before First Game ---');

    // 5.1 Fresh Player without starting_rating: defaults by experience_level
    // EXPERT -> 1800
    const EXP_PLAYER_EMAIL = `exp_player_${RUN_ID}@test.local`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Expert Rating Player',
        email: EXP_PLAYER_EMAIL,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: '1990-01-01',
        gender: 'MALE',
        experience_level: 'EXPERT',
        accept_terms: true
      })
    });
    const [expUserRows] = await pool.query('SELECT user_id, player_id FROM app_user WHERE email = ?', [EXP_PLAYER_EMAIL]);
    const expUser = expUserRows[0];

    // Approve without starting_rating
    const approveExpRes = await fetch(`${BASE_URL}/api/admin/users/${expUser.user_id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const [expPlayerDb] = await pool.query('SELECT current_rating FROM player WHERE player_id = ?', [expUser.player_id]);
    record(
      'Approval without starting_rating sets default rating by experience_level (EXPERT -> 1800)',
      approveExpRes.status === 200 && expPlayerDb[0]?.current_rating === 1800
    );

    // 5.2 Fresh Player with explicit starting_rating: sets specified rating
    const CUSTOM_PLAYER_EMAIL = `custom_player_${RUN_ID}@test.local`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Custom Rating Player',
        email: CUSTOM_PLAYER_EMAIL,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: '1992-02-02',
        gender: 'OTHER',
        experience_level: 'BEGINNER',
        accept_terms: true
      })
    });
    const [customUserRows] = await pool.query('SELECT user_id, player_id FROM app_user WHERE email = ?', [CUSTOM_PLAYER_EMAIL]);
    const customUser = customUserRows[0];

    const approveCustomRes = await fetch(`${BASE_URL}/api/admin/users/${customUser.user_id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ starting_rating: 1650 })
    });
    const [customPlayerDb] = await pool.query('SELECT current_rating FROM player WHERE player_id = ?', [customUser.player_id]);
    record(
      'Approval with starting_rating (1650) sets player current_rating to 1650',
      approveCustomRes.status === 200 && customPlayerDb[0]?.current_rating === 1650
    );

    // 5.3 Player with recorded games: subsequent approval call IGNORES starting_rating
    // Create an ongoing tournament, round, and game for customUser to satisfy foreign keys and workflow triggers
    const [tRatingRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'SWISS', '2026-11-10', '2026-11-12', 'UPCOMING', ?)`,
      [`Rating Test Tourney ${RUN_ID}`, adminUserId]
    );
    const tRatingId = tRatingRes.insertId;

    const [dummyOpponentRes] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, gender, current_rating)
       VALUES ('Dummy Opponent', ?, 'India', '1995-01-01', 'MALE', 1600)`,
      [`dummy_opp_${RUN_ID}@test.local`]
    );
    const dummyOpponentId = dummyOpponentRes.insertId;

    await pool.query(
      'INSERT INTO registration (tournament_id, player_id, rating_at_entry) VALUES (?, ?, 1650), (?, ?, 1600)',
      [tRatingId, customUser.player_id, tRatingId, dummyOpponentId]
    );

    await pool.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [tRatingId]);

    const [rRatingRes] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, 1, 'SCHEDULED')`,
      [tRatingId]
    );
    const rRatingId = rRatingRes.insertId;

    const [gRatingRes] = await pool.query(
      `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
       VALUES (?, 1, ?, ?, 'FINISHED')`,
      [rRatingId, customUser.player_id, dummyOpponentId]
    );
    const gRatingId = gRatingRes.insertId;

    await pool.query(
      `INSERT INTO rating_history (player_id, game_id, old_rating, new_rating, rating_change)
       VALUES (?, ?, 1650, 1665, 15)`,
      [customUser.player_id, gRatingId]
    );

    // Admin attempts to re-approve with starting_rating 2100
    const reApproveRes = await fetch(`${BASE_URL}/api/admin/users/${customUser.user_id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ starting_rating: 2100 })
    });
    const [reApprovePlayerDb] = await pool.query('SELECT current_rating FROM player WHERE player_id = ?', [customUser.player_id]);
    record(
      'Approval call ignores starting_rating once player has games/results (rating stays 1650)',
      reApproveRes.status === 200 && reApprovePlayerDb[0]?.current_rating === 1650
    );

    // -----------------------------------------------------------------
    // 6. Rejected User Stays Blocked
    // -----------------------------------------------------------------
    console.log('\n--- 6. Rejected User Access Block ---');

    const REJECT_EMAIL = `reject_target_${RUN_ID}@test.local`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Reject Target',
        email: REJECT_EMAIL,
        password: 'Password123!',
        confirm_password: 'Password123!',
        date_of_birth: '1994-04-04',
        gender: 'MALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const [rejectUserRows] = await pool.query('SELECT user_id FROM app_user WHERE email = ?', [REJECT_EMAIL]);
    const rejectUserId = rejectUserRows[0].user_id;

    // Verify email first so status is ACTIVE
    const rejectVerifyToken = getLastGeneratedToken();
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rejectVerifyToken })
    });

    // Admin rejects user
    const rejectRes = await fetch(`${BASE_URL}/api/admin/users/${rejectUserId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ note: 'Fraudulent profile information' })
    });
    record('Admin rejects user (200)', rejectRes.status === 200);

    // Rejected user logs in (status ACTIVE) -> returns approval_status: REJECTED, approval_note
    const rejectLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: REJECT_EMAIL, password: 'Password123!' })
    });
    const rejectLoginJson = await rejectLoginRes.json();
    const rejectToken = rejectLoginJson.token;
    record(
      'Rejected user can log in with status ACTIVE, receives approval_status REJECTED and approval_note',
      rejectLoginRes.status === 200 &&
      rejectLoginJson.approval_status === 'REJECTED' &&
      rejectLoginJson.approval_note === 'Fraudulent profile information' &&
      rejectLoginJson.permissions?.can_join_tournaments === false
    );

    // Rejected user blocked from register-me
    const rejectJoinRes = await fetch(`${BASE_URL}/api/tournaments/${upcomingTourneyId}/register-me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rejectToken}` }
    });
    record('Rejected user blocked with 403 NOT_APPROVED on register-me', rejectJoinRes.status === 403);

    // -----------------------------------------------------------------
    // 7. Privacy: Masking via v_organizer_player_access
    // -----------------------------------------------------------------
    console.log('\n--- 7. Privacy Masking Rules ---');

    // Player A (Inside): Enrolled in orgCreatedTourneyId (created by VALID_ORG_EMAIL)
    // Player B (Outside): Enrolled only in admin's upcomingTourneyId
    const [pInsideRes] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, gender, current_rating)
       VALUES ('Inside Player', ?, 'India', '1997-07-07', 'MALE', 1400)`,
      [`inside_${RUN_ID}@test.local`]
    );
    const insidePlayerId = pInsideRes.insertId;

    const [pOutsideRes] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, gender, current_rating)
       VALUES ('Outside Player', ?, 'USA', '1999-09-09', 'FEMALE', 1450)`,
      [`outside_${RUN_ID}@test.local`]
    );
    const outsidePlayerId = pOutsideRes.insertId;

    // Register inside player in organizer's tournament
    await pool.query(
      'INSERT INTO registration (tournament_id, player_id, rating_at_entry) VALUES (?, ?, 1400)',
      [orgCreatedTourneyId, insidePlayerId]
    );

    // Organizer fetches inside player detail -> sees email, date_of_birth
    const orgViewInsideRes = await fetch(`${BASE_URL}/api/players/${insidePlayerId}`, {
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const orgViewInsideJson = await orgViewInsideRes.json();
    record(
      'Organizer sees full contact details (email, date_of_birth) for players enrolled in their tournament',
      orgViewInsideRes.status === 200 &&
      orgViewInsideJson.email === `inside_${RUN_ID}@test.local` &&
      !!orgViewInsideJson.date_of_birth
    );

    // Organizer fetches outside player detail -> email and date_of_birth are masked/null
    const orgViewOutsideRes = await fetch(`${BASE_URL}/api/players/${outsidePlayerId}`, {
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const orgViewOutsideJson = await orgViewOutsideRes.json();
    record(
      'Organizer sees masked/null contact details for players outside their tournaments',
      orgViewOutsideRes.status === 200 &&
      orgViewOutsideJson.email == null &&
      orgViewOutsideJson.date_of_birth == null
    );

    // Admin fetches outside player detail -> sees full contact details
    const adminViewOutsideRes = await fetch(`${BASE_URL}/api/players/${outsidePlayerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminViewOutsideJson = await adminViewOutsideRes.json();
    record(
      'Admin sees complete unmasked details for any player',
      adminViewOutsideRes.status === 200 &&
      adminViewOutsideJson.email === `outside_${RUN_ID}@test.local` &&
      !!adminViewOutsideJson.date_of_birth
    );

    // -----------------------------------------------------------------
    // 8. Organizer Player Management & Removal Restrictions
    // -----------------------------------------------------------------
    console.log('\n--- 8. Organizer Player Management (DELETE registration) ---');

    // Create Organizer 2 (Other)
    const ORG2_EMAIL = `other_org_${RUN_ID}@test.local`;
    const org2Hash = await bcrypt.hash('OtherPass123!', 12);
    const [org2Insert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, approval_status, organization)
       VALUES (?, ?, 'Other Organizer', 'ORGANIZER', 'ACTIVE', 1, 'APPROVED', 'Other Org')`,
      [ORG2_EMAIL, org2Hash]
    );
    const org2UserId = org2Insert.insertId;

    const org2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ORG2_EMAIL, password: 'OtherPass123!' })
    });
    const org2Token = (await org2LoginRes.json()).token;

    // Organizer 2 attempts to remove insidePlayer from Organizer 1's tournament -> 403 Forbidden
    const org2DelRes = await fetch(
      `${BASE_URL}/api/tournaments/${orgCreatedTourneyId}/registrations/${insidePlayerId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${org2Token}` }
      }
    );
    record(
      "Organizer cannot remove a player from another organizer's tournament (403)",
      org2DelRes.status === 403
    );

    // Admin can remove a player from any tournament
    const adminDelRes = await fetch(
      `${BASE_URL}/api/tournaments/${orgCreatedTourneyId}/registrations/${insidePlayerId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    record('Admin can remove a player registration from any tournament (200)', adminDelRes.status === 200);

    // Re-register insidePlayer in orgCreatedTourneyId
    await pool.query(
      'INSERT INTO registration (tournament_id, player_id, rating_at_entry) VALUES (?, ?, 1400)',
      [orgCreatedTourneyId, insidePlayerId]
    );

    // Organizer 1 removes insidePlayer from own UPCOMING tournament -> 200 OK
    const org1DelRes = await fetch(
      `${BASE_URL}/api/tournaments/${orgCreatedTourneyId}/registrations/${insidePlayerId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${orgToken}` }
      }
    );
    record('Owning organizer can remove a player from own UPCOMING tournament (200)', org1DelRes.status === 200);

    // -----------------------------------------------------------------
    // 9. Removal Blocked Once Tournament is ONGOING
    // -----------------------------------------------------------------
    console.log('\n--- 9. Removal Blocked Once ONGOING ---');

    // Create an ONGOING tournament with 2 players registered
    const [tOngoingRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'ROUND_ROBIN', '2026-11-01', '2026-11-05', 'UPCOMING', ?)`,
      [`Ongoing Test Tourney ${RUN_ID}`, orgUser.user_id]
    );
    const ongoingTourneyId = tOngoingRes.insertId;

    await pool.query(
      'INSERT INTO registration (tournament_id, player_id, rating_at_entry) VALUES (?, ?, 1400), (?, ?, 1450)',
      [ongoingTourneyId, insidePlayerId, ongoingTourneyId, outsidePlayerId]
    );

    // Transition to ONGOING
    await pool.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [ongoingTourneyId]);

    // Attempt to remove registration on ONGOING tournament -> 400
    const ongoingDelRes = await fetch(
      `${BASE_URL}/api/tournaments/${ongoingTourneyId}/registrations/${insidePlayerId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${orgToken}` }
      }
    );
    const ongoingDelJson = await ongoingDelRes.json();
    record(
      'Registration removal blocked once tournament is ONGOING (400)',
      ongoingDelRes.status === 400 && ongoingDelJson.code === 'NOT_UPCOMING'
    );

    // -----------------------------------------------------------------
    // 10. Role-specific Dashboard Shapes (GET /api/me/dashboard)
    // -----------------------------------------------------------------
    console.log('\n--- 10. Role-specific Dashboards (GET /api/me/dashboard) ---');

    // 10.1 Player Dashboard
    const playerDashRes = await fetch(`${BASE_URL}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${playerToken}` }
    });
    const playerDashJson = await playerDashRes.json();
    record(
      'Player dashboard returns expected shape (role, approval_status, current_rating, rating_history, wins, open_tournaments, pending_games)',
      playerDashRes.status === 200 &&
      playerDashJson.role === 'PLAYER' &&
      playerDashJson.approval_status === 'APPROVED' &&
      typeof playerDashJson.current_rating === 'number' &&
      Array.isArray(playerDashJson.rating_history) &&
      typeof playerDashJson.wins === 'number' &&
      Array.isArray(playerDashJson.open_tournaments) &&
      Array.isArray(playerDashJson.pending_games)
    );

    // 10.2 Organizer Dashboard
    const orgDashRes = await fetch(`${BASE_URL}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    const orgDashJson = await orgDashRes.json();
    record(
      'Organizer dashboard returns expected shape (role, approval_status, my_tournaments, enrolled_players, recent_results)',
      orgDashRes.status === 200 &&
      orgDashJson.role === 'ORGANIZER' &&
      orgDashJson.approval_status === 'APPROVED' &&
      Array.isArray(orgDashJson.my_tournaments) &&
      typeof orgDashJson.enrolled_players === 'number' &&
      Array.isArray(orgDashJson.recent_results)
    );

    // 10.3 Admin Dashboard
    const adminDashRes = await fetch(`${BASE_URL}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminDashJson = await adminDashRes.json();
    record(
      'Admin dashboard returns expected shape (role, approval_status, user_counts, pending_approvals, tournaments_by_status, recent_audit_logs)',
      adminDashRes.status === 200 &&
      adminDashJson.role === 'ADMIN' &&
      adminDashJson.approval_status === 'APPROVED' &&
      Array.isArray(adminDashJson.user_counts) &&
      Array.isArray(adminDashJson.pending_approvals) &&
      Array.isArray(adminDashJson.tournaments_by_status) &&
      Array.isArray(adminDashJson.recent_audit_logs)
    );

    // -----------------------------------------------------------------
    // 11. Google Auth Token Verification
    // -----------------------------------------------------------------
    console.log('\n--- 11. Google Auth Endpoint Token Verification ---');

    const googleInvalidRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: 'invalid_dummy_google_jwt_token_12345',
        role: 'PLAYER'
      })
    });
    const googleInvalidJson = await googleInvalidRes.json();
    record(
      'Google auth endpoint rejects invalid token with 401 (or 400)',
      (googleInvalidRes.status === 401 && googleInvalidJson.error === 'INVALID_GOOGLE_TOKEN') ||
      (googleInvalidRes.status === 400 && googleInvalidJson.error === 'Invalid Google token')
    );

    const googleMissingRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'PLAYER' })
    });
    record('Google auth endpoint rejects missing token with 400', googleMissingRes.status === 400);

  } catch (err) {
    console.error('Unexpected error in test execution:', err);
  } finally {
    console.log('\n--- Cleaning up test records in chess_scratch ---');
    try {
      // 1. Delete audit logs created during test
      await pool.query(
        `DELETE FROM audit_log WHERE actor_user_id IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );

      // 2. Delete test tournaments (will cascade registrations, rounds, games, results)
      await pool.query(
        `DELETE FROM tournament WHERE created_by IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        ) OR name LIKE '%Tourney %' OR name LIKE '%Matrix%'`
      );

      // 3. Delete any orphaned test registrations
      await pool.query(
        `DELETE FROM registration WHERE player_id IN (
          SELECT player_id FROM player WHERE email LIKE '%@test.local'
        )`
      );

      // 4. Delete rating_history for test players
      await pool.query(
        `DELETE FROM rating_history WHERE player_id IN (
          SELECT player_id FROM player WHERE email LIKE '%@test.local'
        )`
      );

      // 5. Delete tokens
      await pool.query(
        `DELETE FROM auth_token WHERE user_id IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );

      // 6. Delete app_user
      await pool.query("DELETE FROM app_user WHERE email LIKE '%@test.local'");

      // 7. Delete player
      await pool.query("DELETE FROM player WHERE email LIKE '%@test.local'");

      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr.message);
    }

    server.close();
    await pool.end();

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\n======================================================================`);
    console.log(`Account Approval Flow Verification: ${passedCount}/${totalCount} tests passed.`);
    console.log(`======================================================================`);

    if (passedCount !== totalCount) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
};

runTests();
