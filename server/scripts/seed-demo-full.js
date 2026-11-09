import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import { resetDemo, DEMO_EMAIL_DOMAIN } from './reset-demo.js';

const BCRYPT_ROUNDS = 12;

// Seeded PRNG (Mulberry32) for reproducible Elo simulations
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Berger Round Robin generator
function generateRoundRobin(playerIds) {
  const n = playerIds.length;
  const rounds = [];
  const m = n - 1;
  for (let r = 0; r < m; r++) {
    const roundGames = [];
    // Board 1: pair player r and player n-1
    if (r % 2 === 0) {
      roundGames.push({ board: 1, white: playerIds[r], black: playerIds[n - 1] });
    } else {
      roundGames.push({ board: 1, white: playerIds[n - 1], black: playerIds[r] });
    }
    // Other boards
    for (let i = 1; i < n / 2; i++) {
      const p1 = (r + i) % m;
      const p2 = (r - i + m) % m;
      if (i % 2 === 1) {
        roundGames.push({ board: i + 1, white: playerIds[p1], black: playerIds[p2] });
      } else {
        roundGames.push({ board: i + 1, white: playerIds[p2], black: playerIds[p1] });
      }
    }
    rounds.push(roundGames);
  }
  return rounds;
}

// 20 Players specifications
const DEMO_PLAYERS = [
  {
    username: 'aditya_v',
    name: 'Aditya Varma',
    country: 'India',
    country_code: 'IN',
    dob: '2004-03-12',
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Bangalore Chess Academy',
    fide_id: '5001001',
    initial_rating: 2020 // Clear top seed
  },
  {
    username: 'magnus_e',
    name: 'Erik Lindqvist',
    country: 'Norway',
    country_code: 'NO',
    dob: '1999-08-22',
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Oslo Schakselskap',
    fide_id: '1509001',
    initial_rating: 1910 // Foreign 1
  },
  {
    username: 'pranav_r',
    name: 'Pranav Rao',
    country: 'India',
    country_code: 'IN',
    dob: '2001-11-05',
    gender: 'MALE',
    experience_level: 'ADVANCED',
    club: 'Bangalore Chess Club',
    fide_id: '5001002',
    initial_rating: 1840
  },
  {
    username: 'elena_r',
    name: 'Elena Rostova',
    country: 'USA',
    country_code: 'US',
    dob: '2000-05-18',
    gender: 'FEMALE',
    experience_level: 'ADVANCED',
    club: 'Marshall Chess Club',
    fide_id: '2029001',
    initial_rating: 1820 // Foreign 2
  },
  {
    username: 'arjun_m',
    name: 'Arjun Mehta',
    country: 'India',
    country_code: 'IN',
    dob: '2002-04-14',
    gender: 'MALE',
    experience_level: 'ADVANCED',
    club: 'Karnataka Chess Academy',
    fide_id: '5001003',
    initial_rating: 1755 // Close pair 1A
  },
  {
    username: 'karthik_r',
    name: 'Karthik Ramaswamy',
    country: 'India',
    country_code: 'IN',
    dob: '2003-01-29',
    gender: 'MALE',
    experience_level: 'ADVANCED',
    club: 'Mysuru Chess Club',
    fide_id: '5001004',
    initial_rating: 1750 // Close pair 1B
  },
  {
    username: 'timur_k',
    name: 'Timur Karimov',
    country: 'Uzbekistan',
    country_code: 'UZ',
    dob: '2002-09-11',
    gender: 'MALE',
    experience_level: 'ADVANCED',
    club: 'Tashkent Chess Academy',
    fide_id: '1429001',
    initial_rating: 1720 // Foreign 3
  },
  {
    username: 'gayathri_k',
    name: 'Gayathri Krishna',
    country: 'India',
    country_code: 'IN',
    dob: '2001-07-20',
    gender: 'FEMALE',
    experience_level: 'ADVANCED',
    club: 'WACA Masters',
    fide_id: '5001005',
    initial_rating: 1680
  },
  {
    username: 'lucas_m',
    name: 'Lucas Meyer',
    country: 'Germany',
    country_code: 'DE',
    dob: '1998-12-03',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Schachfreunde Berlin',
    fide_id: '1299001',
    initial_rating: 1640 // Foreign 4
  },
  {
    username: 'nithish_s',
    name: 'Nithish Sharma',
    country: 'India',
    country_code: 'IN',
    dob: '2000-10-10',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'RVCE Chess Club',
    fide_id: '5001006',
    initial_rating: 1610
  },
  {
    username: 'ananya_d',
    name: 'Ananya Deshmukh',
    country: 'India',
    country_code: 'IN',
    dob: '2003-06-25',
    gender: 'FEMALE',
    experience_level: 'INTERMEDIATE',
    club: 'Mumbai Chess Academy',
    fide_id: '5001007',
    initial_rating: 1560
  },
  {
    username: 'siddharth_n',
    name: 'Siddharth Nair',
    country: 'India',
    country_code: 'IN',
    dob: '2002-02-17',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Kerala Chess Guild',
    fide_id: '5001008',
    initial_rating: 1510
  },
  {
    username: 'varun_k',
    name: 'Varun Kulkarni',
    country: 'India',
    country_code: 'IN',
    dob: '2004-09-08',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Hubballi Chess Trust',
    fide_id: '5001009',
    initial_rating: 1480
  },
  {
    username: 'rohan_p',
    name: 'Rohan Patel',
    country: 'India',
    country_code: 'IN',
    dob: '2001-03-30',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Gujarat Chess Guild',
    fide_id: '5001010',
    initial_rating: 1425 // Close pair 2A
  },
  {
    username: 'vikram_j',
    name: 'Vikram Joshi',
    country: 'India',
    country_code: 'IN',
    dob: '2002-11-19',
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Pune Chess Circle',
    fide_id: '5001011',
    initial_rating: 1420 // Close pair 2B
  },
  {
    username: 'meera_s',
    name: 'Meera Sundaram',
    country: 'India',
    country_code: 'IN',
    dob: '2003-08-14',
    gender: 'FEMALE',
    experience_level: 'INTERMEDIATE',
    club: 'Chennai Chess League',
    fide_id: '5001012',
    initial_rating: 1390
  },
  {
    username: 'divya_b',
    name: 'Divya Balaji',
    country: 'India',
    country_code: 'IN',
    dob: '2005-01-22',
    gender: 'FEMALE',
    experience_level: 'BEGINNER',
    club: 'RVCE Chess Club',
    fide_id: '5001013',
    initial_rating: 1320
  },
  {
    username: 'rahul_t',
    name: 'Rahul Tiwari',
    country: 'India',
    country_code: 'IN',
    dob: '2004-07-04',
    gender: 'MALE',
    experience_level: 'BEGINNER',
    club: 'Delhi Chess Guild',
    fide_id: '5001014',
    initial_rating: 1280
  },
  {
    username: 'chirag_a',
    name: 'Chirag Agarwal',
    country: 'India',
    country_code: 'IN',
    dob: '2003-12-15',
    gender: 'MALE',
    experience_level: 'BEGINNER',
    club: 'Jaipur Chess Knights',
    fide_id: '5001015',
    initial_rating: 1250
  },
  {
    username: 'tanvi_m',
    name: 'Tanvi Mishra',
    country: 'India',
    country_code: 'IN',
    dob: '2005-05-09',
    gender: 'FEMALE',
    experience_level: 'BEGINNER',
    club: 'Bhopal Chess Club',
    fide_id: '5001016',
    initial_rating: 1210
  }
];

const formatDate = (date) => {
  return date.toISOString().slice(0, 10);
};

export const seedDemo = async () => {
  console.log('[seed-demo] Starting complete demo dataset seeding...');
  const conn = await pool.getConnection();

  try {
    // 1. Safety check
    const [dbCheck] = await conn.query('SELECT DATABASE() AS current_db');
    const currentDb = dbCheck[0]?.current_db;
    if (currentDb === 'chess_db') {
      throw new Error("ABORT: Refusing to seed demo data against production database 'chess_db'! Use DB_NAME=chess_scratch.");
    }
    console.log(`[seed-demo] Connected to database: ${currentDb}`);

    // 2. Clean previous demo records to ensure idempotency
    console.log('[seed-demo] Ensuring clean slate for demo rows...');
    await resetDemo(conn);

    // 3. Pre-hash passwords
    console.log('[seed-demo] Hashing passwords with bcrypt (rounds=12)...');
    const adminPasswordHash = await bcrypt.hash('AdminDemo123', BCRYPT_ROUNDS);
    const organizerPasswordHash = await bcrypt.hash('OrgDemo123', BCRYPT_ROUNDS);
    const playerPasswordHash = await bcrypt.hash('PlayerDemo123', BCRYPT_ROUNDS);

    // 4. Seed Admin
    const adminEmail = `admin_demo${DEMO_EMAIL_DOMAIN}`;
    const [adminRes] = await conn.query(
      `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified, country_code)
       VALUES (?, 'admin_demo', ?, 'Demo Administrator', 'ADMIN', 'ACTIVE', 'APPROVED', 1, 'IN')`,
      [adminEmail, adminPasswordHash]
    );
    const adminUserId = adminRes.insertId;
    await conn.query(
      `INSERT INTO user_account (username, email, password_hash, role)
       VALUES ('admin_demo', ?, ?, 'ADMIN')`,
      [adminEmail, adminPasswordHash]
    );

    // 5. Seed 3 Organizers
    const organizerDefs = [
      {
        username: 'org_rvce',
        email: `org_rvce${DEMO_EMAIL_DOMAIN}`,
        fullName: 'RVCE Chess Club Organizer',
        org: 'RV College of Engineering',
        phone: '+919876543210'
      },
      {
        username: 'org_mysuru',
        email: `org_mysuru${DEMO_EMAIL_DOMAIN}`,
        fullName: 'Mysuru District Chess Association',
        org: 'Mysuru Chess Academy',
        phone: '+919876543211'
      },
      {
        username: 'org_blitz',
        email: `org_blitz${DEMO_EMAIL_DOMAIN}`,
        fullName: 'Bengaluru Blitz Society',
        org: 'Bengaluru Blitz Club',
        phone: '+919876543212'
      }
    ];

    const organizerMap = new Map(); // username -> user_id
    for (const org of organizerDefs) {
      const [oRes] = await conn.query(
        `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified, phone, organization, country_code)
         VALUES (?, ?, ?, ?, 'ORGANIZER', 'ACTIVE', 'APPROVED', 1, ?, ?, 'IN')`,
        [org.email, org.username, organizerPasswordHash, org.fullName, org.phone, org.org]
      );
      organizerMap.set(org.username, oRes.insertId);

      await conn.query(
        `INSERT INTO user_account (username, email, password_hash, role)
         VALUES (?, ?, ?, 'ORGANIZER')`,
        [org.username, org.email, organizerPasswordHash]
      );
    }
    console.log(`[seed-demo] Seeded 1 Admin and ${organizerMap.size} Organizers.`);

    // 6. Seed 20 Players
    const playerMap = new Map(); // username -> player_id
    for (const p of DEMO_PLAYERS) {
      const email = `${p.username}${DEMO_EMAIL_DOMAIN}`;
      const [pRes] = await conn.query(
        `INSERT INTO player (name, email, country, country_code, date_of_birth, gender, experience_level, club, fide_id, current_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.name, email, p.country, p.country_code, p.dob, p.gender, p.experience_level, p.club, p.fide_id, p.initial_rating]
      );
      const playerId = pRes.insertId;
      playerMap.set(p.username, playerId);

      // Create app_user and user_account linked to player
      await conn.query(
        `INSERT INTO app_user (email, username, password_hash, full_name, role, status, approval_status, email_verified, country_code, player_id)
         VALUES (?, ?, ?, ?, 'PLAYER', 'ACTIVE', 'APPROVED', 1, ?, ?)`,
        [email, p.username, playerPasswordHash, p.name, p.country_code, playerId]
      );

      await conn.query(
        `INSERT INTO user_account (username, email, password_hash, role, player_id)
         VALUES (?, ?, ?, 'PLAYER', ?)`,
        [p.username, email, playerPasswordHash, playerId]
      );
    }
    console.log(`[seed-demo] Seeded ${playerMap.size} Players with user accounts.`);

    // 7. Seed Demo Tournaments
    const now = new Date();
    const daysAgo = (d) => formatDate(new Date(now.getTime() - d * 86400000));
    const daysAhead = (d) => formatDate(new Date(now.getTime() + d * 86400000));

    const rng = mulberry32(1337);

    // Track forced upsets
    let forcedUpsetsCount = 0;

    // Helper to simulate and record game outcome
    const recordGame = async (gameId, whitePlayerId, blackPlayerId, forceUpset = false) => {
      const [pRows] = await conn.query(
        'SELECT player_id, current_rating FROM player WHERE player_id IN (?, ?)',
        [whitePlayerId, blackPlayerId]
      );
      const whiteRating = pRows.find(p => p.player_id === whitePlayerId)?.current_rating || 1500;
      const blackRating = pRows.find(p => p.player_id === blackPlayerId)?.current_rating || 1500;

      let outcome;
      if (forceUpset) {
        // Lower rated player wins
        if (blackRating - whiteRating >= 100) {
          outcome = 'WHITE'; // White has much lower rating, White wins
        } else if (whiteRating - blackRating >= 100) {
          outcome = 'BLACK'; // Black has much lower rating, Black wins
        } else {
          // If gap isn't 100 yet, force the slightly lower one to win or default WHITE
          outcome = whiteRating < blackRating ? 'WHITE' : 'BLACK';
        }
        forcedUpsetsCount++;
      } else {
        // Elo expected score for White
        const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
        const roll = rng();
        if (roll < 0.12) {
          outcome = 'DRAW'; // ~12% draws
        } else if (roll < 0.12 + 0.88 * expectedWhite) {
          outcome = 'WHITE';
        } else {
          outcome = 'BLACK';
        }
      }

      await conn.query('CALL record_result(?, ?)', [gameId, outcome]);
    };

    // -------------------------------------------------------------
    // Tournament 1: Bengaluru Blitz (COMPLETED)
    // -------------------------------------------------------------
    const t1OrgId = organizerMap.get('org_blitz');
    const [t1Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, rounds_planned)
       VALUES ('Bengaluru Blitz', 'ROUND_ROBIN', ?, ?, 'UPCOMING', ?, 8, 7)`,
      [daysAgo(25), daysAgo(24), t1OrgId]
    );
    const t1Id = t1Res.insertId;

    const t1Players = [
      'aditya_v',   // 2020
      'magnus_e',   // 1910
      'pranav_r',   // 1840
      'arjun_m',    // 1755
      'karthik_r',  // 1750
      'timur_k',    // 1720
      'gayathri_k', // 1680
      'nithish_s'   // 1610
    ].map(u => playerMap.get(u));

    for (const pid of t1Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t1Id, pid]);
    }
    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t1Id]);

    const t1Rounds = generateRoundRobin(t1Players);
    for (let rIdx = 0; rIdx < t1Rounds.length; rIdx++) {
      const [rRes] = await conn.query(
        'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, "SCHEDULED")',
        [t1Id, rIdx + 1]
      );
      const roundId = rRes.insertId;

      for (const g of t1Rounds[rIdx]) {
        const [gRes] = await conn.query(
          'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
          [roundId, g.board, g.white, g.black]
        );
        const gameId = gRes.insertId;

        // Force 2 upsets in Bengaluru Blitz:
        // Round 1 board 1 (nithish_s vs aditya_v)
        // Round 3 board 2 (gayathri_k vs magnus_e)
        let force = false;
        if (rIdx === 0 && g.board === 1) force = true;
        if (rIdx === 2 && g.board === 2) force = true;

        await recordGame(gameId, g.white, g.black, force);
      }
    }
    await conn.query("UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = ?", [t1Id]);
    console.log('[seed-demo] Created Tournament 1: Bengaluru Blitz (COMPLETED, 28 games recorded).');

    // -------------------------------------------------------------
    // Tournament 2: Mysuru Rapid Cup (ONGOING)
    // -------------------------------------------------------------
    const t2OrgId = organizerMap.get('org_mysuru');
    const [t2Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, rounds_planned)
       VALUES ('Mysuru Rapid Cup', 'ROUND_ROBIN', ?, ?, 'UPCOMING', ?, 8, 7)`,
      [daysAgo(3), daysAhead(4), t2OrgId]
    );
    const t2Id = t2Res.insertId;

    const t2Players = [
      'elena_r',     // ~1820
      'timur_k',     // ~1720
      'lucas_m',     // 1640
      'ananya_d',    // 1560
      'siddharth_n', // 1510
      'varun_k',     // 1480
      'rohan_p',     // 1425
      'vikram_j'     // 1420
    ].map(u => playerMap.get(u));

    for (const pid of t2Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t2Id, pid]);
    }
    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t2Id]);

    const t2Rounds = generateRoundRobin(t2Players);
    // Rounds 1-3 fully recorded (12 games)
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const [rRes] = await conn.query(
        'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, "SCHEDULED")',
        [t2Id, rIdx + 1]
      );
      const roundId = rRes.insertId;

      for (const g of t2Rounds[rIdx]) {
        const [gRes] = await conn.query(
          'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
          [roundId, g.board, g.white, g.black]
        );
        const gameId = gRes.insertId;

        // Force 1 upset in Mysuru Rapid Cup: Round 2 board 1
        let force = false;
        if (rIdx === 1 && g.board === 1) force = true;

        await recordGame(gameId, g.white, g.black, force);
      }
    }

    // Round 4 created with games still PENDING (SCHEDULED, no result)
    const [r4Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, 4, "SCHEDULED")',
      [t2Id]
    );
    const r4Id = r4Res.insertId;
    for (const g of t2Rounds[3]) {
      await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
        [r4Id, g.board, g.white, g.black]
      );
    }
    console.log('[seed-demo] Created Tournament 2: Mysuru Rapid Cup (ONGOING, rounds 1-3 finished, round 4 pending).');

    // -------------------------------------------------------------
    // Tournament 3: RVCE Open 2026 (UPCOMING)
    // -------------------------------------------------------------
    const t3OrgId = organizerMap.get('org_rvce');
    const [t3Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, registration_deadline, status, created_by, max_players, rounds_planned)
       VALUES ('RVCE Open 2026', 'SWISS', ?, ?, ?, 'UPCOMING', ?, 16, 5)`,
      [daysAhead(10), daysAhead(15), daysAhead(8), t3OrgId]
    );
    const t3Id = t3Res.insertId;

    const t3Players = [
      'aditya_v',
      'pranav_r',
      'arjun_m',
      'karthik_r',
      'gayathri_k',
      'nithish_s',
      'ananya_d',
      'rohan_p',
      'meera_s',
      'divya_b',
      'chirag_a',
      'tanvi_m'
    ].map(u => playerMap.get(u));

    for (const pid of t3Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t3Id, pid]);
    }
    console.log('[seed-demo] Created Tournament 3: RVCE Open 2026 (UPCOMING, 12 players registered, 0 rounds).');

    // -------------------------------------------------------------
    // Tournament 4: Karnataka Classic (COMPLETED)
    // -------------------------------------------------------------
    const t4OrgId = organizerMap.get('org_rvce');
    const [t4Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, rounds_planned)
       VALUES ('Karnataka Classic', 'ROUND_ROBIN', ?, ?, 'UPCOMING', ?, 6, 5)`,
      [daysAgo(40), daysAgo(36), t4OrgId]
    );
    const t4Id = t4Res.insertId;

    const t4Players = [
      'arjun_m',     // 1755
      'lucas_m',     // 1640
      'siddharth_n', // 1510
      'varun_k',     // 1480
      'meera_s',     // 1390
      'rahul_t'      // 1280
    ].map(u => playerMap.get(u));

    for (const pid of t4Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t4Id, pid]);
    }
    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t4Id]);

    const t4Rounds = generateRoundRobin(t4Players);
    for (let rIdx = 0; rIdx < t4Rounds.length; rIdx++) {
      const [rRes] = await conn.query(
        'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, "SCHEDULED")',
        [t4Id, rIdx + 1]
      );
      const roundId = rRes.insertId;

      for (const g of t4Rounds[rIdx]) {
        const [gRes] = await conn.query(
          'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
          [roundId, g.board, g.white, g.black]
        );
        const gameId = gRes.insertId;

        // Force 2 upsets in Karnataka Classic:
        // Round 1 board 1 (rahul_t vs arjun_m)
        // Round 3 board 2 (meera_s vs lucas_m)
        let force = false;
        if (rIdx === 0 && g.board === 1) force = true;
        if (rIdx === 2 && g.board === 2) force = true;

        await recordGame(gameId, g.white, g.black, force);
      }
    }
    await conn.query("UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = ?", [t4Id]);
    console.log('[seed-demo] Created Tournament 4: Karnataka Classic (COMPLETED, 15 games recorded).');

    // -------------------------------------------------------------
    // Predictions (for UPCOMING and ONGOING tournaments)
    // -------------------------------------------------------------
    console.log('[seed-demo] Inserting demo predictions for RVCE Open 2026 and Mysuru Rapid Cup...');
    const t3PredictedScores = [4.5, 4.0, 3.5, 3.5, 3.0, 2.5, 2.5, 2.0, 2.0, 1.5, 1.0, 1.0];
    for (let i = 0; i < t3Players.length; i++) {
      await conn.query(
        `INSERT INTO prediction (player_id, tournament_id, predicted_score, model_version)
         VALUES (?, ?, ?, 'demo')`,
        [t3Players[i], t3Id, t3PredictedScores[i]]
      );
    }

    const t2PredictedScores = [5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0];
    for (let i = 0; i < t2Players.length; i++) {
      await conn.query(
        `INSERT INTO prediction (player_id, tournament_id, predicted_score, model_version)
         VALUES (?, ?, ?, 'demo')`,
        [t2Players[i], t2Id, t2PredictedScores[i]]
      );
    }

    // -------------------------------------------------------------
    // Final Summary Verification
    // -------------------------------------------------------------
    const [totalUpsets] = await conn.query('SELECT COUNT(*) AS cnt FROM result WHERE is_upset = 1');
    const [completedStandings] = await conn.query(
      'SELECT tournament_id, COUNT(*) AS cnt FROM tournament_standings WHERE tournament_id IN (?, ?) GROUP BY tournament_id',
      [t1Id, t4Id]
    );

    console.log('\n===============================================================');
    console.log('              CHESS MAGIC - DEMO SEED SUMMARY                 ');
    console.log('===============================================================');
    console.table([
      { Entity: 'Admin Account', Value: '1 (admin_demo / AdminDemo123)' },
      { Entity: 'Organizer Accounts', Value: '3 (org_rvce, org_mysuru, org_blitz / OrgDemo123)' },
      { Entity: 'Player Accounts', Value: '20 linked players (PlayerDemo123)' },
      { Entity: 'Bengaluru Blitz', Value: `ID ${t1Id} | COMPLETED | 8 players | 28 games` },
      { Entity: 'Mysuru Rapid Cup', Value: `ID ${t2Id} | ONGOING | 8 players | 12 finished, 4 pending` },
      { Entity: 'RVCE Open 2026', Value: `ID ${t3Id} | UPCOMING | 12 registered | 0 rounds` },
      { Entity: 'Karnataka Classic', Value: `ID ${t4Id} | COMPLETED | 6 players | 15 games` },
      { Entity: 'Total Upsets Recorded', Value: `${totalUpsets[0].cnt} (at least 4 required)` },
      { Entity: 'Predictions Seeded', Value: `${t3Players.length + t2Players.length} (model_version: demo)` }
    ]);
    console.log('Demo dataset successfully seeded.\n');

    return {
      t1Id,
      t2Id,
      t3Id,
      t4Id,
      totalUpsets: totalUpsets[0].cnt
    };
  } finally {
    conn.release();
  }
};

const run = async () => {
  try {
    await seedDemo();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('FATAL: seed-demo-full failed:', err);
    await pool.end();
    process.exit(1);
  }
};

if (process.argv[1]?.endsWith('seed-demo-full.js')) {
  run();
}
