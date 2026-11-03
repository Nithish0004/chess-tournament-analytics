import { pool } from '../src/config/db.js';

const playersData = [
  {
    name: 'Magnus Carlsen',
    email: 'magnus.demo@chess.demo',
    country: 'Norway',
    date_of_birth: '1990-11-30',
    current_rating: 2832,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Offerspill Sjakklubb',
    fide_id: '1503014'
  },
  {
    name: 'Hikaru Nakamura',
    email: 'hikaru@example.com',
    country: 'USA',
    date_of_birth: '1987-12-09',
    current_rating: 2802,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Blitz Kings Guild',
    fide_id: '2016192'
  },
  {
    name: 'Fabiano Caruana',
    email: 'fabiano@example.com',
    country: 'USA',
    date_of_birth: '1992-07-30',
    current_rating: 2805,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Saint Louis Chess Club',
    fide_id: '2020009'
  },
  {
    name: 'Gukesh D',
    email: 'gukesh@example.com',
    country: 'India',
    date_of_birth: '2006-05-29',
    current_rating: 2794,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'WACA Masters',
    fide_id: '46616543'
  },
  {
    name: 'Arjun Erigaisi',
    email: 'arjun@example.com',
    country: 'India',
    date_of_birth: '2003-09-03',
    current_rating: 2797,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Telangana Chess Academy',
    fide_id: '35009192'
  },
  {
    name: 'Nodirbek Abdusattorov',
    email: 'nodirbek@example.com',
    country: 'Uzbekistan',
    date_of_birth: '2004-09-18',
    current_rating: 2783,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Tashkent Chess Guild',
    fide_id: '14203983'
  },
  {
    name: 'Alireza Firouzja',
    email: 'alireza@example.com',
    country: 'France',
    date_of_birth: '2003-06-18',
    current_rating: 2767,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'C' + 'HARTRES Echecs',
    fide_id: '12573981'
  },
  {
    name: 'Wei Yi',
    email: 'weiyi@example.com',
    country: 'China',
    date_of_birth: '1999-06-02',
    current_rating: 2762,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Jiangsu Chess Team',
    fide_id: '8603405'
  },
  {
    name: 'Viswanathan Anand',
    email: 'vishy@example.com',
    country: 'India',
    date_of_birth: '1969-12-11',
    current_rating: 2750,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'WACA Academy',
    fide_id: '5000017'
  },
  {
    name: 'Praggnanandhaa R',
    email: 'pragg@example.com',
    country: 'India',
    date_of_birth: '2005-08-10',
    current_rating: 2746,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Bloom Chess Trust',
    fide_id: '25059530'
  },
  {
    name: 'Ian Nepomniachtchi',
    email: 'ian@example.com',
    country: 'FIDE',
    date_of_birth: '1990-07-14',
    current_rating: 2755,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Central Chess Club',
    fide_id: '4168119'
  },
  {
    name: 'Ding Liren',
    email: 'ding@example.com',
    country: 'China',
    date_of_birth: '1992-10-24',
    current_rating: 2736,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Zhejiang Sports Team',
    fide_id: '8603677'
  },
  {
    name: 'Vincent Keymer',
    email: 'vincent@example.com',
    country: 'Germany',
    date_of_birth: '2004-11-15',
    current_rating: 2730,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'OSG Baden-Baden',
    fide_id: '12940690'
  },
  {
    name: 'Vidit Gujrathi',
    email: 'vidit@example.com',
    country: 'India',
    date_of_birth: '1994-10-24',
    current_rating: 2720,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Maharashtra Chess Team',
    fide_id: '5029465'
  },
  {
    name: 'Anish Giri',
    email: 'anish@example.com',
    country: 'Netherlands',
    date_of_birth: '1994-06-28',
    current_rating: 2740,
    gender: 'MALE',
    experience_level: 'EXPERT',
    club: 'Kennemer Combinatie',
    fide_id: '24116068'
  },
  {
    name: 'Asha Sharma',
    email: 'asha.club@example.com',
    country: 'India',
    date_of_birth: '2000-01-15',
    current_rating: 2500,
    gender: 'FEMALE',
    experience_level: 'ADVANCED',
    club: 'Delhi Chess Guild',
    fide_id: '5089123'
  },
  {
    name: 'Gautham',
    email: 'goutham@gmail.com',
    country: 'India',
    date_of_birth: '2006-05-13',
    current_rating: 1200,
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Bangalore Chess Academy',
    fide_id: '5099881'
  },
  {
    name: 'Nandan',
    email: 'nandan@gmail.com',
    country: 'India',
    date_of_birth: '2005-04-13',
    current_rating: 1200,
    gender: 'MALE',
    experience_level: 'INTERMEDIATE',
    club: 'Karnataka Youth Club',
    fide_id: '5099882'
  },
  {
    name: 'Pending Player',
    email: 'player.pending@chess.demo',
    country: 'India',
    date_of_birth: '2005-06-15',
    current_rating: 1000,
    gender: 'OTHER',
    experience_level: 'BEGINNER',
    club: 'Junior Chess Club',
    fide_id: '5099883'
  }
];

const run = async () => {
  console.log('Seeding comprehensive demo chess tournament data...');
  const conn = await pool.getConnection();

  try {
    // 1. Safety check
    const [dbCheck] = await conn.query('SELECT DATABASE() AS current_db');
    const currentDb = dbCheck[0]?.current_db;
    console.log(`[Safety Check] Confirmed database in use: ${currentDb}`);
    if (currentDb !== 'chess_scratch') {
      console.error(`FATAL: seed-demo must ONLY run against 'chess_scratch'! Current DB: ${currentDb}`);
      process.exit(1);
    }

    // 2. Identify organizer user ID to assign tournament ownership
    const [orgRows] = await conn.query(
      "SELECT user_id FROM app_user WHERE role = 'ORGANIZER' AND approval_status = 'APPROVED' LIMIT 1"
    );
    const organizerId = orgRows[0]?.user_id || null;
    console.log(`Using Organizer user_id: ${organizerId} for demo tournaments.`);

    // 3. Clear existing operational data cleanly
    console.log('Cleaning existing demo data...');
    await conn.query('DELETE FROM prediction');
    await conn.query('DELETE FROM tournament');

    // Delete players that are NOT linked to app_user (to preserve foreign key integrity on app_user)
    await conn.query('UPDATE app_user SET player_id = NULL');
    await conn.query('DELETE FROM player');

    // Reset AUTO_INCREMENT counters
    await conn.query('ALTER TABLE player AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE tournament AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE tournament_round AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE game AUTO_INCREMENT = 1');

    console.log(`Inserting ${playersData.length} players with rich chess profiles...`);
    const playerMap = new Map(); // email -> player_id
    for (const p of playersData) {
      const [res] = await conn.query(
        `INSERT INTO player (name, email, country, date_of_birth, current_rating, gender, experience_level, club, fide_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.name, p.email, p.country, p.date_of_birth, p.current_rating, p.gender, p.experience_level, p.club, p.fide_id]
      );
      playerMap.set(p.email, res.insertId);
    }
    console.log(`Inserted ${playerMap.size} players.`);

    // 4. Re-link app_user accounts to player records
    const magnusId = playerMap.get('magnus.demo@chess.demo');
    const pendingPlayerId = playerMap.get('player.pending@chess.demo');
    const gauthamId = playerMap.get('goutham@gmail.com');
    const nandanId = playerMap.get('nandan@gmail.com');

    if (magnusId) {
      await conn.query("UPDATE app_user SET player_id = ? WHERE email = 'player.approved@chess.demo'", [magnusId]);
    }
    if (pendingPlayerId) {
      await conn.query(
        "UPDATE app_user SET player_id = ?, approval_status = 'PENDING' WHERE email = 'player.pending@chess.demo'",
        [pendingPlayerId]
      );
    }
    if (gauthamId) {
      await conn.query("UPDATE app_user SET player_id = ? WHERE email = 'goutham@gmail.com'", [gauthamId]);
    }
    if (nandanId) {
      await conn.query("UPDATE app_user SET player_id = ? WHERE email = 'nandan@gmail.com'", [nandanId]);
    }

    // Ensure pending organizer has approval_status = 'PENDING'
    await conn.query("UPDATE app_user SET approval_status = 'PENDING' WHERE email = 'organizer.pending@chess.demo'");
    console.log('Linked app_user accounts and reset pending approval states.');

    // 5. Create Tournament 1: Tata Steel Masters 2026 (ONGOING)
    const [t1Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, registration_deadline, rounds_planned)
       VALUES (?, 'ROUND_ROBIN', '2026-10-15', '2026-11-15', 'UPCOMING', ?, 8, '2026-10-14', 3)`,
      ['Tata Steel Masters 2026', organizerId]
    );
    const t1Id = t1Res.insertId;

    // Register 8 players to Tournament 1
    const t1PlayerEmails = [
      'magnus.demo@chess.demo',
      'hikaru@example.com',
      'fabiano@example.com',
      'gukesh@example.com',
      'arjun@example.com',
      'nodirbek@example.com',
      'alireza@example.com',
      'asha.club@example.com'
    ];
    const t1PlayerIds = t1PlayerEmails.map(email => playerMap.get(email));
    for (const pid of t1PlayerIds) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t1Id, pid]);
    }
    console.log(`Registered ${t1PlayerIds.length} players to Tournament 1 (Tata Steel Masters).`);

    // Transition Tournament 1 to ONGOING
    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t1Id]);

    // Create Round 1 in Tournament 1
    const [r1Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, 1, "SCHEDULED")',
      [t1Id]
    );
    const r1Id = r1Res.insertId;

    // Create Round 2 in Tournament 1
    const [r2Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, 2, "SCHEDULED")',
      [t1Id]
    );
    const r2Id = r2Res.insertId;

    // Create Round 3 in Tournament 1 (SCHEDULED / in-progress)
    const [r3Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, 3, "SCHEDULED")',
      [t1Id]
    );
    const r3Id = r3Res.insertId;

    // Games for Round 1
    const t1r1Games = [
      { board: 1, white: t1PlayerIds[0], black: t1PlayerIds[1], outcome: 'WHITE' }, // Magnus beats Hikaru
      { board: 2, white: t1PlayerIds[2], black: t1PlayerIds[3], outcome: 'DRAW' },  // Fabiano draws Gukesh
      { board: 3, white: t1PlayerIds[4], black: t1PlayerIds[5], outcome: 'BLACK' }, // Nodirbek beats Arjun
      { board: 4, white: t1PlayerIds[7], black: t1PlayerIds[6], outcome: 'WHITE' }  // Asha (2500) beats Alireza (2767) -> UPSET!
    ];

    const r1GameIds = [];
    for (const g of t1r1Games) {
      const [gRes] = await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
        [r1Id, g.board, g.white, g.black]
      );
      r1GameIds.push({ id: gRes.insertId, outcome: g.outcome });
    }

    // Games for Round 2
    const t1r2Games = [
      { board: 1, white: t1PlayerIds[1], black: t1PlayerIds[2], outcome: 'WHITE' }, // Hikaru beats Fabiano
      { board: 2, white: t1PlayerIds[3], black: t1PlayerIds[4], outcome: 'DRAW' },  // Gukesh draws Arjun
      { board: 3, white: t1PlayerIds[5], black: t1PlayerIds[0], outcome: 'WHITE' }, // Nodirbek beats Magnus
      { board: 4, white: t1PlayerIds[6], black: t1PlayerIds[7], outcome: 'WHITE' }  // Alireza beats Asha
    ];

    const r2GameIds = [];
    for (const g of t1r2Games) {
      const [gRes] = await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
        [r2Id, g.board, g.white, g.black]
      );
      r2GameIds.push({ id: gRes.insertId, outcome: g.outcome });
    }

    // Games for Round 3 (unplayed scheduled games)
    const t1r3Games = [
      { board: 1, white: t1PlayerIds[0], black: t1PlayerIds[2] }, // Magnus (W) vs Fabiano (B)
      { board: 2, white: t1PlayerIds[1], black: t1PlayerIds[3] }, // Hikaru vs Gukesh
      { board: 3, white: t1PlayerIds[4], black: t1PlayerIds[6] }, // Arjun vs Alireza
      { board: 4, white: t1PlayerIds[5], black: t1PlayerIds[7] }  // Nodirbek vs Asha
    ];
    for (const g of t1r3Games) {
      await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, "SCHEDULED")',
        [r3Id, g.board, g.white, g.black]
      );
    }

    // Record official results via stored procedure
    console.log('Recording game results for Tata Steel Masters...');
    for (const g of r1GameIds) {
      await conn.query('CALL record_result(?, ?)', [g.id, g.outcome]);
    }
    for (const g of r2GameIds) {
      await conn.query('CALL record_result(?, ?)', [g.id, g.outcome]);
    }

    // 6. Create Tournament 2: FIDE Candidates 2026 (UPCOMING, 6/8 registered -> Open for registration!)
    const [t2Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, registration_deadline, rounds_planned)
       VALUES (?, 'ROUND_ROBIN', '2026-11-20', '2026-12-10', 'UPCOMING', ?, 8, '2026-11-18', 7)`,
      ['FIDE Candidates 2026', organizerId]
    );
    const t2Id = t2Res.insertId;

    const t2PlayerEmails = [
      'vishy@example.com',
      'pragg@example.com',
      'ian@example.com',
      'ding@example.com',
      'vincent@example.com',
      'vidit@example.com'
    ];
    for (const email of t2PlayerEmails) {
      const pid = playerMap.get(email);
      if (pid) {
        await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t2Id, pid]);
      }
    }
    console.log(`Created Tournament 2 (FIDE Candidates 2026) with 6/8 players (UPCOMING).`);

    // 7. Create Tournament 3: World Rapid Championship 2025 (COMPLETED)
    const [t3Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, registration_deadline, rounds_planned)
       VALUES (?, 'ROUND_ROBIN', '2025-12-01', '2025-12-10', 'UPCOMING', ?, 4, '2025-11-30', 1)`,
      ['World Rapid Championship 2025', organizerId]
    );
    const t3Id = t3Res.insertId;

    const t3PlayerEmails = [
      'magnus.demo@chess.demo',
      'hikaru@example.com',
      'fabiano@example.com',
      'gukesh@example.com'
    ];
    const t3PlayerIds = t3PlayerEmails.map(email => playerMap.get(email));
    for (const pid of t3PlayerIds) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t3Id, pid]);
    }

    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t3Id]);

    const [t3r1Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, 1, "SCHEDULED")',
      [t3Id]
    );
    const t3r1Id = t3r1Res.insertId;

    const [t3g1] = await conn.query(
      'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, 1, ?, ?, "SCHEDULED")',
      [t3r1Id, t3PlayerIds[0], t3PlayerIds[1]]
    );
    const [t3g2] = await conn.query(
      'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, 2, ?, ?, "SCHEDULED")',
      [t3r1Id, t3PlayerIds[2], t3PlayerIds[3]]
    );

    await conn.query('CALL record_result(?, ?)', [t3g1.insertId, 'WHITE']);
    await conn.query('CALL record_result(?, ?)', [t3g2.insertId, 'DRAW']);

    await conn.query("UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = ?", [t3Id]);
    console.log(`Created Tournament 3 (World Rapid Championship 2025) as COMPLETED.`);

    // 8. Create Tournament 4: National Challengers Cup 2026 (UPCOMING, SWISS)
    const [t4Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status, created_by, max_players, registration_deadline, rounds_planned)
       VALUES (?, 'SWISS', '2026-12-01', '2026-12-15', 'UPCOMING', ?, 16, '2026-11-28', 5)`,
      ['National Challengers Cup 2026', organizerId]
    );
    const t4Id = t4Res.insertId;

    const t4PlayerEmails = [
      'goutham@gmail.com',
      'nandan@gmail.com',
      'anish@example.com',
      'weiyi@example.com'
    ];
    for (const email of t4PlayerEmails) {
      const pid = playerMap.get(email);
      if (pid) {
        await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t4Id, pid]);
      }
    }
    console.log(`Created Tournament 4 (National Challengers Cup 2026) with 4/16 players (UPCOMING, SWISS).`);

    console.log('\n======================================================');
    console.log('Demo seed completed successfully!');
    console.log(`- Total Players: ${playerMap.size}`);
    console.log(`- Tournaments: 4 (ONGOING: 1, UPCOMING: 2, COMPLETED: 1)`);
    console.log(`- Tata Steel Masters: ID ${t1Id} (ONGOING, 8 players, 2 finished rounds, 1 scheduled round)`);
    console.log(`- FIDE Candidates: ID ${t2Id} (UPCOMING, 6/8 registered, open for registration)`);
    console.log(`- World Rapid Championship: ID ${t3Id} (COMPLETED)`);
    console.log(`- National Challengers Cup: ID ${t4Id} (UPCOMING, 4/16 registered, SWISS)`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding demo data:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
};

run();
