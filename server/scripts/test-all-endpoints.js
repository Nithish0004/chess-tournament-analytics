process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'console';

import bcrypt from 'bcrypt';
import createApp from '../src/app.js';
import { pool } from '../src/config/db.js';
import { getLastGeneratedToken } from '../src/utils/tokens.js';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runTests = async () => {
  console.log('--- Starting Comprehensive RBAC & Security Verification Suite ---');
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Test server running at ${BASE_URL}`);
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
    const [dbCheck] = await pool.query('SELECT DATABASE() AS current_db');
    const currentDb = dbCheck[0]?.current_db;
    if (currentDb !== 'chess_scratch') {
      console.error(`FATAL: test-all-endpoints must only run against chess_scratch. Current database is: ${currentDb}`);
      process.exit(1);
    }

    // ---------------------------------------------------------------
    // 1. Health check & unauthenticated baseline
    // ---------------------------------------------------------------
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    record('GET /health is public', healthRes.status === 200 && healthJson.status === 'ok');

    const unauthPlayersRes = await fetch(`${BASE_URL}/api/players`);
    record('GET /api/players without auth returns 401', unauthPlayersRes.status === 401);

    // ---------------------------------------------------------------
    // 2. Set up test accounts with unique *@test.local emails
    // ---------------------------------------------------------------
    const ADMIN_EMAIL = `admin_${RUN_ID}@test.local`;
    const ADMIN_PASS = 'AdminTest123!';
    const adminHash = await bcrypt.hash(ADMIN_PASS, 12);
    const [adminInsert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, approval_status)
       VALUES (?, ?, 'Test Administrator', 'ADMIN', 'ACTIVE', 1, 'APPROVED')`,
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
    record(
      'Admin login returns token and permissions object',
      adminLoginRes.status === 200 && !!adminToken && adminLoginJson.permissions?.can_access_admin === true
    );

    // Create Organizer 1 (owner)
    const ORG1_EMAIL = `org_owner_${RUN_ID}@test.local`;
    const ORG1_PASS = 'OrgOwner123!';
    const org1Hash = await bcrypt.hash(ORG1_PASS, 12);
    const [org1Insert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, organization, approval_status)
       VALUES (?, ?, 'Organizer Owner', 'ORGANIZER', 'ACTIVE', 1, 'Owner Org', 'APPROVED')`,
      [ORG1_EMAIL, org1Hash]
    );
    const org1UserId = org1Insert.insertId;

    const org1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ORG1_EMAIL, password: ORG1_PASS })
    });
    const org1LoginJson = await org1LoginRes.json();
    const org1Token = org1LoginJson.token;
    record(
      'Organizer Owner login returns token and permissions object',
      org1LoginRes.status === 200 && !!org1Token && org1LoginJson.permissions?.can_create_tournament === true
    );

    // Create Organizer 2 (other)
    const ORG2_EMAIL = `org_other_${RUN_ID}@test.local`;
    const ORG2_PASS = 'OrgOther123!';
    const org2Hash = await bcrypt.hash(ORG2_PASS, 12);
    const [org2Insert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, organization, approval_status)
       VALUES (?, ?, 'Organizer Other', 'ORGANIZER', 'ACTIVE', 1, 'Other Org', 'APPROVED')`,
      [ORG2_EMAIL, org2Hash]
    );
    const org2UserId = org2Insert.insertId;

    const org2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ORG2_EMAIL, password: ORG2_PASS })
    });
    const org2LoginJson = await org2LoginRes.json();
    const org2Token = org2LoginJson.token;
    record('Organizer Other login returns token', org2LoginRes.status === 200 && !!org2Token);

    // Create Player 1 (user with linked player)
    const PLAYER1_EMAIL = `player_${RUN_ID}@test.local`;
    const PLAYER1_PASS = 'PlayerPass123!';
    const [player1DbInsert] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, current_rating)
       VALUES ('Test Player One', ?, 'India', '1995-05-15', 1500)`,
      [PLAYER1_EMAIL]
    );
    const player1Id = player1DbInsert.insertId;

    const player1Hash = await bcrypt.hash(PLAYER1_PASS, 12);
    const [player1UserInsert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, player_id, approval_status)
       VALUES (?, ?, 'Test Player One', 'PLAYER', 'ACTIVE', 1, ?, 'APPROVED')`,
      [PLAYER1_EMAIL, player1Hash, player1Id]
    );
    const player1UserId = player1UserInsert.insertId;

    const player1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PLAYER1_EMAIL, password: PLAYER1_PASS })
    });
    const player1LoginJson = await player1LoginRes.json();
    const player1Token = player1LoginJson.token;
    record(
      'Player login returns token and permissions object',
      player1LoginRes.status === 200 && !!player1Token && player1LoginJson.permissions?.can_self_register === true
    );

    // Create Player 2 (another linked user account)
    const PLAYER2_EMAIL = `player2_${RUN_ID}@test.local`;
    const [player2DbInsert] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, current_rating)
       VALUES ('Test Player Two', ?, 'USA', '1998-08-20', 1600)`,
      [PLAYER2_EMAIL]
    );
    const player2Id = player2DbInsert.insertId;

    const player2Hash = await bcrypt.hash('Player2Pass123!', 12);
    const [player2UserInsert] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, player_id, approval_status)
       VALUES (?, ?, 'Test Player Two', 'PLAYER', 'ACTIVE', 1, ?, 'APPROVED')`,
      [PLAYER2_EMAIL, player2Hash, player2Id]
    );
    const player2UserId = player2UserInsert.insertId;

    // Create Walk-in Player (NO linked app_user row)
    const WALKIN_EMAIL = `walkin_${RUN_ID}@test.local`;
    const [walkinDbInsert] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, current_rating)
       VALUES ('Walkin Player', ?, 'France', '2000-01-01', 1400)`,
      [WALKIN_EMAIL]
    );
    const walkinPlayerId = walkinDbInsert.insertId;

    // Extra walk-in players for board matchups
    const [w1Res] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, current_rating)
       VALUES ('Matchup Player A', ?, 'Germany', '1992-02-02', 1450)`,
      [`matcha_${RUN_ID}@test.local`]
    );
    const matchupPlayerAId = w1Res.insertId;

    const [w2Res] = await pool.query(
      `INSERT INTO player (name, email, country, date_of_birth, current_rating)
       VALUES ('Matchup Player B', ?, 'Spain', '1993-03-03', 1420)`,
      [`matchb_${RUN_ID}@test.local`]
    );
    const matchupPlayerBId = w2Res.insertId;

    // ---------------------------------------------------------------
    // 3. Set up tournament fixtures
    // ---------------------------------------------------------------
    // Tournament 1: Owned by Organizer 1, UPCOMING
    const [tOwnedRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'ROUND_ROBIN', '2026-11-20', '2026-11-25', 'UPCOMING', ?)`,
      [`Org1 Tourney ${RUN_ID}`, org1UserId]
    );
    const tOwnedId = tOwnedRes.insertId;

    // Register players in tOwned for game scheduling
    await pool.query(
      'INSERT INTO registration (tournament_id, player_id, rating_at_entry) VALUES (?, ?, 1450), (?, ?, 1420)',
      [tOwnedId, matchupPlayerAId, tOwnedId, matchupPlayerBId]
    );

    // Transition tOwned to ONGOING so rounds and games can be created
    await pool.query(
      "UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?",
      [tOwnedId]
    );

    // Round 1 in tOwned
    const [rOwnedRes] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status)
       VALUES (?, 1, 'SCHEDULED')`,
      [tOwnedId]
    );
    const rOwnedId = rOwnedRes.insertId;

    // Game 1 in rOwned
    const [gOwnedRes] = await pool.query(
      `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
       VALUES (?, 1, ?, ?, 'SCHEDULED')`,
      [rOwnedId, matchupPlayerAId, matchupPlayerBId]
    );
    const gOwnedId = gOwnedRes.insertId;

    // Round 2 in tOwned for admin result test
    const [rRound2Res] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status)
       VALUES (?, 2, 'SCHEDULED')`,
      [tOwnedId]
    );
    const rRound2Id = rRound2Res.insertId;

    const [gAdminRes] = await pool.query(
      `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
       VALUES (?, 1, ?, ?, 'SCHEDULED')`,
      [rRound2Id, matchupPlayerAId, matchupPlayerBId]
    );
    const gAdminId = gAdminRes.insertId;

    // Round 3 in tOwned for organizer result test
    const [rRound3Res] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status)
       VALUES (?, 3, 'SCHEDULED')`,
      [tOwnedId]
    );
    const rRound3Id = rRound3Res.insertId;

    const [gOrgRes] = await pool.query(
      `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
       VALUES (?, 1, ?, ?, 'SCHEDULED')`,
      [rRound3Id, matchupPlayerAId, matchupPlayerBId]
    );
    const gOrgId = gOrgRes.insertId;

    // Round 4 for ADMIN game creation test
    const [rGameAdminRes] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status)
       VALUES (?, 4, 'SCHEDULED')`,
      [tOwnedId]
    );
    const rGameAdminId = rGameAdminRes.insertId;

    // Round 5 for ORGANIZER (owner) game creation test
    const [rGameOrgRes] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status)
       VALUES (?, 5, 'SCHEDULED')`,
      [tOwnedId]
    );
    const rGameOrgId = rGameOrgRes.insertId;

    // Tournament 2: Dedicated upcoming tournament for self-registration test
    const [tSelfRegRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'SWISS', '2026-12-01', '2026-12-05', 'UPCOMING', ?)`,
      [`Self Reg Tourney ${RUN_ID}`, org1UserId]
    );
    const tSelfRegId = tSelfRegRes.insertId;

    // Dedicated upcoming tournament for registration endpoint matrix test
    const [tRegMatrixRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'SWISS', '2026-12-10', '2026-12-15', 'UPCOMING', ?)`,
      [`Reg Matrix Tourney ${RUN_ID}`, org1UserId]
    );
    const tRegMatrixId = tRegMatrixRes.insertId;

    // Tournament 3: COMPLETED tournament owned by Organizer 1
    const [tCompletedRes] = await pool.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by)
       VALUES (?, 'KNOCKOUT', '2026-10-01', '2026-10-05', 'UPCOMING', ?)`,
      [`Completed Tourney ${RUN_ID}`, org1UserId]
    );
    const tCompletedId = tCompletedRes.insertId;

    await pool.query(
      'INSERT INTO registration (tournament_id, player_id, rating_at_entry) VALUES (?, ?, 1450), (?, ?, 1420)',
      [tCompletedId, matchupPlayerAId, tCompletedId, matchupPlayerBId]
    );

    await pool.query(
      "UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?",
      [tCompletedId]
    );

    // Round and game in completed tournament
    const [rCompletedRes] = await pool.query(
      `INSERT INTO tournament_round (tournament_id, round_no, status)
       VALUES (?, 1, 'COMPLETED')`,
      [tCompletedId]
    );
    const rCompletedId = rCompletedRes.insertId;

    const [gCompletedRes] = await pool.query(
      `INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
       VALUES (?, 1, ?, ?, 'FINISHED')`,
      [rCompletedId, matchupPlayerAId, matchupPlayerBId]
    );
    const gCompletedId = gCompletedRes.insertId;

    // Now mark tournament as COMPLETED
    await pool.query(
      "UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = ?",
      [tCompletedId]
    );

    // Dummy user for admin action testing
    const [dummyUserRes] = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, approval_status)
       VALUES (?, ?, 'Dummy Action Target', 'PLAYER', 'ACTIVE', 1, 'APPROVED')`,
      [`dummy_${RUN_ID}@test.local`, adminHash]
    );
    const dummyUserId = dummyUserRes.insertId;

    // Pool of walk-in players for registration testing
    const [extraReg1] = await pool.query(
      `INSERT INTO player (name, email, current_rating) VALUES ('Extra 1', ?, 1200)`,
      [`extra1_${RUN_ID}@test.local`]
    );
    const extraReg1Id = extraReg1.insertId;

    const [extraReg2] = await pool.query(
      `INSERT INTO player (name, email, current_rating) VALUES ('Extra 2', ?, 1200)`,
      [`extra2_${RUN_ID}@test.local`]
    );
    const extraReg2Id = extraReg2.insertId;

    // ---------------------------------------------------------------
    // 4. TABLE-DRIVEN RBAC PERMISSION MATRIX
    // ---------------------------------------------------------------
    const tokens = {
      ADMIN: adminToken,
      'ORGANIZER (owner)': org1Token,
      'ORGANIZER (other)': org2Token,
      PLAYER: player1Token
    };

    let regCounter = 0;
    const regPlayers = [extraReg1Id, extraReg2Id];
    let boardCounter = 10;

    const rbacMatrix = [
      {
        rule: 'Any ACTIVE user may read dashboard',
        method: 'GET',
        path: () => '/api/dashboard',
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'Any ACTIVE user may read tournaments',
        method: 'GET',
        path: () => '/api/tournaments',
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'Any ACTIVE user may read tournament by id',
        method: 'GET',
        path: () => `/api/tournaments/${tOwnedId}`,
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'Any ACTIVE user may read standings',
        method: 'GET',
        path: () => `/api/tournaments/${tOwnedId}/standings`,
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'Any ACTIVE user may read analytics',
        method: 'GET',
        path: () => `/api/tournaments/${tOwnedId}/analytics`,
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'Any ACTIVE user may read predictions',
        method: 'GET',
        path: () => `/api/tournaments/${tOwnedId}/predictions`,
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'GET /api/players: all active users can read list',
        method: 'GET',
        path: () => '/api/players',
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'GET /api/players/:id: all active users can read record',
        method: 'GET',
        path: () => `/api/players/${player2Id}`,
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 200
        }
      },
      {
        rule: 'POST /api/tournaments: ADMIN, ORGANIZER create; PLAYER blocked',
        method: 'POST',
        path: () => '/api/tournaments',
        body: (role) => ({
          name: `Tourney Matrix ${role} ${Date.now()}`,
          format: 'ROUND_ROBIN',
          start_date: '2026-11-20',
          end_date: '2026-11-25',
          status: 'UPCOMING'
        }),
        expected: {
          ADMIN: 201,
          'ORGANIZER (owner)': 201,
          'ORGANIZER (other)': 201,
          PLAYER: 403
        }
      },
      {
        rule: 'PUT /api/tournaments/:id: ADMIN any; ORGANIZER owner only; PLAYER never',
        method: 'PUT',
        path: () => `/api/tournaments/${tOwnedId}`,
        body: () => ({ name: 'Renamed Tournament' }),
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'POST /api/tournaments/:id/register: ADMIN any; ORGANIZER owner only; PLAYER never',
        method: 'POST',
        path: () => `/api/tournaments/${tRegMatrixId}/register`,
        body: (role) => {
          const pid = role === 'ADMIN' ? regPlayers[0] : (role === 'ORGANIZER (owner)' ? regPlayers[1] : 9999);
          return { player_id: pid };
        },
        expected: {
          ADMIN: 201,
          'ORGANIZER (owner)': 201,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'POST /api/tournaments/:id/rounds: ADMIN any; ORGANIZER owner only; PLAYER never',
        method: 'POST',
        path: () => `/api/tournaments/${tOwnedId}/rounds`,
        body: () => ({}),
        expected: {
          ADMIN: 201,
          'ORGANIZER (owner)': 201,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'POST /api/rounds/:id/games: ADMIN any; ORGANIZER owner only; PLAYER never',
        method: 'POST',
        path: (role) => (role === 'ORGANIZER (owner)' ? `/api/rounds/${rGameOrgId}/games` : `/api/rounds/${rGameAdminId}/games`),
        body: () => ({
          board_no: ++boardCounter,
          white_player_id: matchupPlayerAId,
          black_player_id: matchupPlayerBId
        }),
        expected: {
          ADMIN: 201,
          'ORGANIZER (owner)': 201,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'POST /api/games/:id/result: ADMIN any; ORGANIZER owner only; PLAYER never',
        method: 'POST',
        path: (role) => {
          if (role === 'ADMIN') return `/api/games/${gAdminId}/result`;
          if (role === 'ORGANIZER (owner)') return `/api/games/${gOrgId}/result`;
          return `/api/games/${gOwnedId}/result`;
        },
        body: () => ({ outcome: 'WHITE' }),
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'POST /api/tournaments/:id/register-me: PLAYER only',
        method: 'POST',
        path: () => `/api/tournaments/${tSelfRegId}/register-me`,
        body: () => ({}),
        expected: {
          ADMIN: 403,
          'ORGANIZER (owner)': 403,
          'ORGANIZER (other)': 403,
          PLAYER: 201
        }
      },
      {
        rule: 'POST /api/players (walk-in): ADMIN, ORGANIZER; PLAYER never',
        method: 'POST',
        path: () => '/api/players',
        body: (role) => ({
          name: `Walkin created by ${role}`,
          email: `walkin_role_${role.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}@test.local`,
          country: 'Canada',
          current_rating: 1250
        }),
        expected: {
          ADMIN: 201,
          'ORGANIZER (owner)': 201,
          'ORGANIZER (other)': 201,
          PLAYER: 403
        }
      },
      {
        rule: 'PUT /api/players/:id on walk-in player (NO linked user): ADMIN & ORGANIZER allowed; PLAYER blocked',
        method: 'PUT',
        path: () => `/api/players/${walkinPlayerId}`,
        body: () => ({ country: 'Netherlands' }),
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 200,
          'ORGANIZER (other)': 200,
          PLAYER: 403
        }
      },
      {
        rule: 'PUT /api/players/:id on player WITH linked account: ADMIN allowed; ORGANIZERS blocked',
        method: 'PUT',
        path: () => `/api/players/${player2Id}`,
        body: () => ({ country: 'Sweden' }),
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 403,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'GET /api/admin/users: ADMIN only',
        method: 'GET',
        path: () => '/api/admin/users',
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 403,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'GET /api/admin/overview: ADMIN only',
        method: 'GET',
        path: () => '/api/admin/overview',
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 403,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      },
      {
        rule: 'POST /api/admin/users/:id/suspend: ADMIN only',
        method: 'POST',
        path: () => `/api/admin/users/${dummyUserId}/suspend`,
        body: null,
        expected: {
          ADMIN: 200,
          'ORGANIZER (owner)': 403,
          'ORGANIZER (other)': 403,
          PLAYER: 403
        }
      }
    ];

    console.log('\n--- Running Table-Driven Matrix Tests ---');
    const roles = ['ADMIN', 'ORGANIZER (owner)', 'ORGANIZER (other)', 'PLAYER'];

    for (const testCase of rbacMatrix) {
      for (const role of roles) {
        const token = tokens[role];
        const expectedStatus = testCase.expected[role];
        const endpointPath = typeof testCase.path === 'function' ? testCase.path(role) : testCase.path;
        const reqBody = typeof testCase.body === 'function' ? testCase.body(role) : testCase.body;

        const options = {
          method: testCase.method,
          headers: {
            Authorization: `Bearer ${token}`
          }
        };
        if (reqBody !== null) {
          options.headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(reqBody);
        }

        const res = await fetch(`${BASE_URL}${endpointPath}`, options);
        const passed = res.status === expectedStatus;
        record(
          `[${role}] ${testCase.rule}`,
          passed,
          `status: ${res.status}, expected: ${expectedStatus}`
        );
      }
    }

    // ---------------------------------------------------------------
    // 5. Special Rule: Player sees masked/omitted email & date_of_birth
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Player Masking Rules ---');
    // Player reads list: other players omit email and date_of_birth; own record has them
    const playerListRes = await fetch(`${BASE_URL}/api/players`, {
      headers: { Authorization: `Bearer ${player1Token}` }
    });
    const playerListJson = await playerListRes.json();
    const ownPlayerInList = playerListJson.find(p => p.player_id === player1Id);
    const otherPlayerInList = playerListJson.find(p => p.player_id === player2Id);

    const ownHasDetails = ownPlayerInList && ownPlayerInList.email === PLAYER1_EMAIL && !!ownPlayerInList.date_of_birth;
    const otherOmitted = otherPlayerInList && otherPlayerInList.email === undefined && otherPlayerInList.date_of_birth === undefined;

    record(
      'Player sees full email and date_of_birth on own record in GET /api/players',
      ownHasDetails,
      `own email: ${ownPlayerInList?.email}`
    );
    record(
      'Player sees masked/omitted email and date_of_birth for other players in GET /api/players',
      otherOmitted,
      `other email: ${otherPlayerInList?.email}`
    );

    // Player reads other player directly
    const playerOtherRes = await fetch(`${BASE_URL}/api/players/${player2Id}`, {
      headers: { Authorization: `Bearer ${player1Token}` }
    });
    const playerOtherJson = await playerOtherRes.json();
    record(
      'Player receives other player record WITHOUT email and date_of_birth on GET /api/players/:id',
      playerOtherRes.status === 200 && playerOtherJson.email === undefined && playerOtherJson.date_of_birth === undefined
    );

    // Player reads own player record directly
    const playerSelfRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      headers: { Authorization: `Bearer ${player1Token}` }
    });
    const playerSelfJson = await playerSelfRes.json();
    record(
      'Player receives complete own record with email and date_of_birth on GET /api/players/:id',
      playerSelfRes.status === 200 && playerSelfJson.email === PLAYER1_EMAIL && !!playerSelfJson.date_of_birth
    );

    // Admin sees everything
    const adminOtherRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminOtherJson = await adminOtherRes.json();
    record(
      'Admin sees complete player record including email and date_of_birth',
      adminOtherRes.status === 200 && adminOtherJson.email === PLAYER1_EMAIL && !!adminOtherJson.date_of_birth
    );

    // Organizer sees everything
    const orgOtherRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const orgOtherJson = await orgOtherRes.json();
    record(
      'Organizer sees complete player record including email and date_of_birth',
      orgOtherRes.status === 200 && orgOtherJson.email === PLAYER1_EMAIL && !!orgOtherJson.date_of_birth
    );

    // ---------------------------------------------------------------
    // 6. Special Rule: Completed tournament blocks organizer (403 "Tournament is completed")
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Completed Tournament Block Rules ---');
    const orgCompletedEditRes = await fetch(`${BASE_URL}/api/tournaments/${tCompletedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`
      },
      body: JSON.stringify({ name: 'Org Attempted Rename' })
    });
    const orgCompletedEditJson = await orgCompletedEditRes.json();
    record(
      'Completed tournament blocks organizer edit (403 "Tournament is completed")',
      orgCompletedEditRes.status === 403 && (orgCompletedEditJson.error === 'Tournament is completed' || orgCompletedEditJson.message === 'Tournament is completed'),
      orgCompletedEditJson.error
    );

    const orgCompletedRoundRes = await fetch(`${BASE_URL}/api/tournaments/${tCompletedId}/rounds`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const orgCompletedRoundJson = await orgCompletedRoundRes.json();
    record(
      'Completed tournament blocks organizer creating rounds (403 "Tournament is completed")',
      orgCompletedRoundRes.status === 403 && (orgCompletedRoundJson.error === 'Tournament is completed' || orgCompletedRoundJson.message === 'Tournament is completed')
    );

    const orgCompletedGameRes = await fetch(`${BASE_URL}/api/rounds/${rCompletedId}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`
      },
      body: JSON.stringify({
        board_no: 99,
        white_player_id: matchupPlayerAId,
        black_player_id: matchupPlayerBId
      })
    });
    const orgCompletedGameJson = await orgCompletedGameRes.json();
    record(
      'Completed tournament blocks organizer creating games (403 "Tournament is completed")',
      orgCompletedGameRes.status === 403 && (orgCompletedGameJson.error === 'Tournament is completed' || orgCompletedGameJson.message === 'Tournament is completed')
    );

    const orgCompletedResultRes = await fetch(`${BASE_URL}/api/games/${gCompletedId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${org1Token}`
      },
      body: JSON.stringify({ outcome: 'WHITE' })
    });
    const orgCompletedResultJson = await orgCompletedResultRes.json();
    record(
      'Completed tournament blocks organizer recording results (403 "Tournament is completed")',
      orgCompletedResultRes.status === 403 && (orgCompletedResultJson.error === 'Tournament is completed' || orgCompletedResultJson.message === 'Tournament is completed')
    );

    // ADMIN can edit completed tournament
    const adminCompletedEditRes = await fetch(`${BASE_URL}/api/tournaments/${tCompletedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Admin Allowed Edit on Completed' })
    });
    record(
      'Admin is permitted to edit completed tournament (status 200)',
      adminCompletedEditRes.status === 200
    );

    // ---------------------------------------------------------------
    // 7. Special Rule: Rating edit returns 400 "Rating cannot be edited directly"
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Direct Rating Edit Block Rules ---');
    const adminRatingEditRes = await fetch(`${BASE_URL}/api/players/${walkinPlayerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ current_rating: 2000 })
    });
    const adminRatingEditJson = await adminRatingEditRes.json();
    record(
      'Admin rating edit returns 400 "Rating cannot be edited directly"',
      adminRatingEditRes.status === 400 && (adminRatingEditJson.error === 'Rating cannot be edited directly' || adminRatingEditJson.message === 'Rating cannot be edited directly')
    );

    const playerRatingEditRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${player1Token}`
      },
      body: JSON.stringify({ current_rating: 2500 })
    });
    const playerRatingEditJson = await playerRatingEditRes.json();
    record(
      'Player own rating edit returns 400 "Rating cannot be edited directly"',
      playerRatingEditRes.status === 400 && (playerRatingEditJson.error === 'Rating cannot be edited directly' || playerRatingEditJson.message === 'Rating cannot be edited directly')
    );

    // Player editing own profile without rating edit succeeds
    const playerSelfEditRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${player1Token}`
      },
      body: JSON.stringify({ country: 'India' })
    });
    record(
      'Player successfully updates own profile without rating field (status 200)',
      playerSelfEditRes.status === 200
    );

    // ---------------------------------------------------------------
    // 8. Special Rule: Admin self-protection
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Admin Self-Protection Rules ---');
    const adminSelfSuspendRes = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminSelfSuspendJson = await adminSelfSuspendRes.json();
    record(
      'Admin cannot suspend themselves (400)',
      adminSelfSuspendRes.status === 400 && adminSelfSuspendJson.error === 'An admin cannot suspend themselves'
    );

    const adminSelfRoleRes = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ role: 'ORGANIZER' })
    });
    const adminSelfRoleJson = await adminSelfRoleRes.json();
    record(
      'Admin cannot change their own role (400)',
      adminSelfRoleRes.status === 400 && adminSelfRoleJson.error === 'An admin cannot change their own role'
    );

    // 8.1 Admin Overview Payload Verification
    const adminOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminOverviewJson = await adminOverviewRes.json();
    const overviewValid = 
      adminOverviewRes.status === 200 &&
      typeof adminOverviewJson.users === 'object' &&
      typeof adminOverviewJson.tournaments === 'object' &&
      typeof adminOverviewJson.games === 'object' &&
      Array.isArray(adminOverviewJson.rating_distribution?.bands) &&
      Array.isArray(adminOverviewJson.top_players) &&
      Array.isArray(adminOverviewJson.recent_upsets) &&
      Array.isArray(adminOverviewJson.recent_audit) &&
      adminOverviewJson.system?.database_reachable === true;

    record(
      'GET /api/admin/overview returns full structured metrics payload',
      overviewValid,
      `Users: ${adminOverviewJson.users?.total}, Tournaments: ${adminOverviewJson.tournaments?.active?.length}`
    );

    // ---------------------------------------------------------------
    // 9. Special Rule: can_manage, created_by, owner_name on tournaments
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Tournament can_manage, created_by, and owner_name ---');
    const adminTourneyRes = await fetch(`${BASE_URL}/api/tournaments/${tOwnedId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminTourneyJson = await adminTourneyRes.json();
    record(
      'GET /api/tournaments/:id includes created_by and owner_name',
      adminTourneyJson.created_by === org1UserId && adminTourneyJson.owner_name === 'Organizer Owner'
    );
    record(
      'Admin has can_manage=true on tournament',
      adminTourneyJson.can_manage === true
    );

    const org1TourneyRes = await fetch(`${BASE_URL}/api/tournaments/${tOwnedId}`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const org1TourneyJson = await org1TourneyRes.json();
    record(
      'Organizer Owner has can_manage=true on owned UPCOMING tournament',
      org1TourneyJson.can_manage === true
    );

    const org1CompletedTourneyRes = await fetch(`${BASE_URL}/api/tournaments/${tCompletedId}`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const org1CompletedTourneyJson = await org1CompletedTourneyRes.json();
    record(
      'Organizer Owner has can_manage=false on owned COMPLETED tournament',
      org1CompletedTourneyJson.can_manage === false
    );

    const org2TourneyRes = await fetch(`${BASE_URL}/api/tournaments/${tOwnedId}`, {
      headers: { Authorization: `Bearer ${org2Token}` }
    });
    const org2TourneyJson = await org2TourneyRes.json();
    record(
      'Organizer Other has can_manage=false on another organizer tournament',
      org2TourneyJson.can_manage === false
    );

    const playerTourneyRes = await fetch(`${BASE_URL}/api/tournaments/${tOwnedId}`, {
      headers: { Authorization: `Bearer ${player1Token}` }
    });
    const playerTourneyJson = await playerTourneyRes.json();
    record(
      'Player has can_manage=false on tournament',
      playerTourneyJson.can_manage === false
    );

    // ---------------------------------------------------------------
    // 10. Special Rule: can_edit flag on player objects
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Player can_edit flag ---');
    // Admin has can_edit=true on any player
    const adminPlayerRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminPlayerJson = await adminPlayerRes.json();
    record('Admin has can_edit=true on player profile', adminPlayerJson.can_edit === true);

    // Organizer has can_edit=true on walk-in player without user account
    const orgWalkinRes = await fetch(`${BASE_URL}/api/players/${walkinPlayerId}`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const orgWalkinJson = await orgWalkinRes.json();
    record('Organizer has can_edit=true on walk-in player', orgWalkinJson.can_edit === true);

    // Organizer has can_edit=false on player with linked account
    const orgLinkedRes = await fetch(`${BASE_URL}/api/players/${player1Id}`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const orgLinkedJson = await orgLinkedRes.json();
    record('Organizer has can_edit=false on player with linked user account', orgLinkedJson.can_edit === false);

    // Player has can_edit=true on own profile
    record('Player has can_edit=true on own profile', playerSelfJson.can_edit === true);

    // Player has can_edit=false on other player profile
    record('Player has can_edit=false on other player profile', playerOtherJson.can_edit === false);

    // ---------------------------------------------------------------
    // 11. Special Rule: permissions object in /api/auth/me
    // ---------------------------------------------------------------
    console.log('\n--- Verifying permissions in /api/auth/me ---');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const meJson = await meRes.json();
    record(
      'GET /api/auth/me returns permissions object',
      meRes.status === 200 && typeof meJson.permissions === 'object' && meJson.permissions.can_access_admin === true
    );

    // ---------------------------------------------------------------
    // 12. Account Lockout & Suspension security checks
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Account Lockout & Suspension ---');
    const LOCKOUT_EMAIL = `lockout_${RUN_ID}@test.local`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Lockout Target',
        email: LOCKOUT_EMAIL,
        password: 'CorrectPass123!',
        confirm_password: 'CorrectPass123!',
        date_of_birth: '1998-01-01',
        gender: 'MALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const lockoutVerifyToken = getLastGeneratedToken();
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: lockoutVerifyToken })
    });

    for (let i = 1; i <= 5; i++) {
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: LOCKOUT_EMAIL, password: 'WrongPassword!' })
      });
    }

    const lockedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOCKOUT_EMAIL, password: 'CorrectPass123!' })
    });
    const lockedLoginJson = await lockedLoginRes.json();
    record(
      'Account locks out after 5 failed attempts (429 LOCKED)',
      lockedLoginRes.status === 429 && lockedLoginJson.code === 'LOCKED'
    );

    // Suspend check: suspended user token immediately blocked
    await fetch(`${BASE_URL}/api/admin/users/${dummyUserId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dummyLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `dummy_${RUN_ID}@test.local`, password: ADMIN_PASS })
    });
    const dummyLoginJson = await dummyLoginRes.json();
    record(
      'Suspended user login rejected with 403 SUSPENDED',
      dummyLoginRes.status === 403 && dummyLoginJson.code === 'SUSPENDED'
    );

    // ---------------------------------------------------------------
    // 8. Unified user_account & Auth Redesign Verification
    // ---------------------------------------------------------------
    console.log('\n--- Verifying Unified user_account & Redesign Auth ---');
    const NEW_PLAYER_USER = `player_acc_${RUN_ID}`.slice(0, 20);
    const NEW_PLAYER_EMAIL = `p_acc_${RUN_ID}@test.local`;
    const NEW_ORG_USER = `org_acc_${RUN_ID}`.slice(0, 20);
    const NEW_ORG_EMAIL = `o_acc_${RUN_ID}@test.local`;
    const ACC_PASS = 'P@ssword1234!';

    // Register PLAYER
    const regPlayerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'PLAYER',
        full_name: 'Additive Player Test',
        username: NEW_PLAYER_USER,
        email: NEW_PLAYER_EMAIL,
        password: ACC_PASS,
        confirm_password: ACC_PASS,
        date_of_birth: '1998-05-15',
        gender: 'MALE',
        experience_level: 'INTERMEDIATE',
        accept_terms: true
      })
    });
    const regPlayerJson = await regPlayerRes.json();
    record(
      'POST /api/auth/register PLAYER succeeds (200/201)',
      regPlayerRes.status === 200 || regPlayerRes.status === 201
    );

    // Verify player row created with 1200 rating
    const [pRow] = await pool.query(
      'SELECT player_id, current_rating FROM player WHERE email = ?',
      [NEW_PLAYER_EMAIL]
    );
    record(
      'PLAYER registration creates linked player row with rating 1200',
      pRow.length > 0 && Number(pRow[0].current_rating) === 1200
    );

    // Verify user_account row created
    const [accRow] = await pool.query(
      'SELECT account_id, username, email, role, player_id FROM user_account WHERE email = ?',
      [NEW_PLAYER_EMAIL]
    );
    record(
      'PLAYER registration records in user_account with player_id FK',
      accRow.length > 0 && accRow[0].role === 'PLAYER' && accRow[0].player_id === pRow[0].player_id
    );

    // Register ORGANIZER
    const regOrgRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'ORGANIZER',
        full_name: 'Additive Organizer Test',
        username: NEW_ORG_USER,
        email: NEW_ORG_EMAIL,
        password: ACC_PASS,
        confirm_password: ACC_PASS,
        phone: '+15550001111',
        organization: 'Chess Masters Org',
        accept_terms: true
      })
    });
    record(
      'POST /api/auth/register ORGANIZER succeeds (200/201)',
      regOrgRes.status === 200 || regOrgRes.status === 201
    );

    const [orgAccRow] = await pool.query(
      'SELECT account_id, username, email, role, player_id FROM user_account WHERE email = ?',
      [NEW_ORG_EMAIL]
    );
    record(
      'ORGANIZER registration creates account in user_account without player_id (NULL)',
      orgAccRow.length > 0 && orgAccRow[0].role === 'ORGANIZER' && orgAccRow[0].player_id === null
    );

    // Verify email for the new test accounts so they can login
    await pool.query('UPDATE app_user SET status = "ACTIVE", email_verified = 1, approval_status = "APPROVED" WHERE email IN (?, ?)', [NEW_PLAYER_EMAIL, NEW_ORG_EMAIL]);

    // Test Login via USERNAME
    const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: NEW_PLAYER_USER,
        password: ACC_PASS
      })
    });
    const loginUserJson = await loginUserRes.json();
    record(
      'POST /api/auth/login with username returns JWT and role PLAYER',
      loginUserRes.status === 200 && !!loginUserJson.token && loginUserJson.user?.role === 'PLAYER'
    );

    // Test Login via EMAIL
    const loginEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: NEW_ORG_EMAIL,
        password: ACC_PASS
      })
    });
    const loginEmailJson = await loginEmailRes.json();
    record(
      'POST /api/auth/login with email returns JWT and role ORGANIZER',
      loginEmailRes.status === 200 && !!loginEmailJson.token && loginEmailJson.user?.role === 'ORGANIZER'
    );

    // Test Legacy admin_user table login
    const ADMIN_USER_NAME = `admin_legacy_${RUN_ID}`.slice(0, 20);
    const adminUserHash = await bcrypt.hash('LegacyAdminPass123!', 12);
    await pool.query(
      'INSERT INTO admin_user (username, password_hash, role) VALUES (?, ?, "ADMIN")',
      [ADMIN_USER_NAME, adminUserHash]
    );
    const adminLegacyRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_USER_NAME,
        password: 'LegacyAdminPass123!'
      })
    });
    const adminLegacyJson = await adminLegacyRes.json();
    record(
      'Legacy admin_user table login succeeds and returns JWT with role ADMIN',
      adminLegacyRes.status === 200 && !!adminLegacyJson.token && adminLegacyJson.user?.role === 'ADMIN'
    );

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    console.log('\n--- Cleaning up test records to preserve demo data ---');
    try {
      // 1. Delete test tournaments first (CASCADE removes rounds, games, results, rating_history, registrations)
      await pool.query(
        `DELETE FROM tournament WHERE created_by IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        ) OR name LIKE '%Matrix%' OR name LIKE '%Org1 Tourney%'
          OR name LIKE '%Self Reg%' OR name LIKE '%Completed Tourney%'
          OR name LIKE '%Tourney by%'`
      );

      // 2. Delete any orphaned registrations of test players
      await pool.query(
        `DELETE FROM registration WHERE player_id IN (
          SELECT player_id FROM player WHERE email LIKE '%@test.local'
        )`
      );

      // 6. Delete tokens
      await pool.query(
        `DELETE FROM auth_token WHERE user_id IN (
          SELECT user_id FROM app_user WHERE email LIKE '%@test.local'
        )`
      );

      // 7. Delete app_user and user_account rows
      await pool.query("DELETE FROM user_account WHERE email LIKE '%@test.local' OR username LIKE 'admin_legacy_%'");
      await pool.query("DELETE FROM admin_user WHERE username LIKE 'admin_legacy_%'");
      await pool.query("DELETE FROM app_user WHERE email LIKE '%@test.local'");

      // 8. Delete player rows
      await pool.query("DELETE FROM player WHERE email LIKE '%@test.local'");

      console.log('Test records successfully cleaned up.');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr.message);
    }

    server.close();
    await pool.end();

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\n=================================================`);
    console.log(`Verification Complete: ${passedCount}/${totalCount} tests passed.`);
    console.log(`=================================================`);

    if (passedCount !== totalCount) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
};

runTests();
