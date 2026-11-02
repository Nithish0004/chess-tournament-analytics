import { pool } from '../src/config/db.js';

const playersData = [
  { name: 'Magnus Carlsen', email: 'magnus@example.com', country: 'Norway', date_of_birth: '1990-11-30', current_rating: 2832 },
  { name: 'Hikaru Nakamura', email: 'hikaru@example.com', country: 'USA', date_of_birth: '1987-12-09', current_rating: 2802 },
  { name: 'Fabiano Caruana', email: 'fabiano@example.com', country: 'USA', date_of_birth: '1992-07-30', current_rating: 2805 },
  { name: 'Gukesh D', email: 'gukesh@example.com', country: 'India', date_of_birth: '2006-05-29', current_rating: 2794 },
  { name: 'Arjun Erigaisi', email: 'arjun@example.com', country: 'India', date_of_birth: '2003-09-03', current_rating: 2797 },
  { name: 'Nodirbek Abdusattorov', email: 'nodirbek@example.com', country: 'Uzbekistan', date_of_birth: '2004-09-18', current_rating: 2783 },
  { name: 'Alireza Firouzja', email: 'alireza@example.com', country: 'France', date_of_birth: '2003-06-18', current_rating: 2767 },
  { name: 'Wei Yi', email: 'weiyi@example.com', country: 'China', date_of_birth: '1999-06-02', current_rating: 2762 },
  { name: 'Viswanathan Anand', email: 'vishy@example.com', country: 'India', date_of_birth: '1969-12-11', current_rating: 2750 },
  { name: 'Praggnanandhaa R', email: 'pragg@example.com', country: 'India', date_of_birth: '2005-08-10', current_rating: 2746 },
  { name: 'Ian Nepomniachtchi', email: 'ian@example.com', country: 'FIDE', date_of_birth: '1990-07-14', current_rating: 2755 },
  { name: 'Ding Liren', email: 'ding@example.com', country: 'China', date_of_birth: '1992-10-24', current_rating: 2736 },
  { name: 'Vincent Keymer', email: 'vincent@example.com', country: 'Germany', date_of_birth: '2004-11-15', current_rating: 2730 },
  { name: 'Vidit Gujrathi', email: 'vidit@example.com', country: 'India', date_of_birth: '1994-10-24', current_rating: 2720 },
  { name: 'Anish Giri', email: 'anish@example.com', country: 'Netherlands', date_of_birth: '1994-06-28', current_rating: 2740 },
  { name: 'Asha Sharma', email: 'asha.club@example.com', country: 'India', date_of_birth: '2000-01-15', current_rating: 2500 }
];

const run = async () => {
  console.log('Seeding demo chess tournament data...');
  const conn = await pool.getConnection();

  try {
    // Clean existing operational data using cascade from tournament, then players
    console.log('Cleaning existing demo data...');
    await conn.query('DELETE FROM prediction');
    await conn.query('DELETE FROM tournament');
    await conn.query('DELETE FROM player');

    // Reset AUTO_INCREMENT counters
    await conn.query('ALTER TABLE player AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE tournament AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE tournament_round AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE game AUTO_INCREMENT = 1');


    console.log(`Inserting ${playersData.length} players...`);
    const playerIds = [];
    for (const p of playersData) {
      const [res] = await conn.query(
        `INSERT INTO player (name, email, country, date_of_birth, current_rating)
         VALUES (?, ?, ?, ?, ?)`,
        [p.name, p.email, p.country, p.date_of_birth, p.current_rating]
      );
      playerIds.push(res.insertId);
    }
    console.log(`Inserted ${playerIds.length} players.`);

    // Tournament 1: Tata Steel Masters 2026 (ONGOING)
    const [t1Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'UPCOMING')`,
      ['Tata Steel Masters 2026', 'ROUND_ROBIN', '2026-10-15', '2026-11-05']
    );
    const t1Id = t1Res.insertId;

    // Tournament 2: FIDE Candidates 2026 (UPCOMING - starts after 2026-11-15)
    const [t2Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'UPCOMING')`,
      ['FIDE Candidates 2026', 'ROUND_ROBIN', '2026-11-20', '2026-12-10']
    );
    const t2Id = t2Res.insertId;

    // Tournament 3: World Rapid Championship 2025 (COMPLETED)
    const [t3Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'UPCOMING')`,
      ['World Rapid Championship 2025', 'ROUND_ROBIN', '2025-12-01', '2025-12-10']
    );
    const t3Id = t3Res.insertId;

    console.log(`Created Tournaments: T1 (ID: ${t1Id}), T2 (ID: ${t2Id}), T3 (ID: ${t3Id}) as UPCOMING.`);

    // Register players 1-8 to Tournament 1
    const t1Players = [playerIds[0], playerIds[1], playerIds[2], playerIds[3], playerIds[4], playerIds[5], playerIds[6], playerIds[15]];
    for (const pid of t1Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t1Id, pid]);
    }
    console.log(`Registered ${t1Players.length} players to Tournament ${t1Id}.`);

    // Register players 8-15 to Tournament 2
    const t2Players = playerIds.slice(7, 15);
    for (const pid of t2Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t2Id, pid]);
    }
    console.log(`Registered ${t2Players.length} players to Tournament ${t2Id}.`);

    // Register players 1-4 to Tournament 3
    const t3Players = [playerIds[0], playerIds[1], playerIds[2], playerIds[3]];
    for (const pid of t3Players) {
      await conn.query('INSERT INTO registration (tournament_id, player_id) VALUES (?, ?)', [t3Id, pid]);
    }
    console.log(`Registered ${t3Players.length} players to Tournament ${t3Id}.`);

    // Start Tournaments 1 and 3 (move to ONGOING)
    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t1Id]);
    await conn.query("UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = ?", [t3Id]);
    console.log(`Started Tournaments ${t1Id} and ${t3Id} (status ONGOING).`);

    // Create Round 1 in Tournament 1
    const [r1Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [t1Id, 1, 'SCHEDULED']
    );
    const r1Id = r1Res.insertId;

    // Create Round 2 in Tournament 1
    const [r2Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [t1Id, 2, 'SCHEDULED']
    );
    const r2Id = r2Res.insertId;

    // Create Round 3 in Tournament 1 (scheduled / in-progress)
    const [r3Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [t1Id, 3, 'SCHEDULED']
    );
    const r3Id = r3Res.insertId;

    // Insert Games for Round 1 of Tournament 1
    const t1r1Games = [
      { board: 1, white: t1Players[0], black: t1Players[1], outcome: 'WHITE' },
      { board: 2, white: t1Players[2], black: t1Players[3], outcome: 'DRAW' },
      { board: 3, white: t1Players[4], black: t1Players[5], outcome: 'BLACK' },
      { board: 4, white: t1Players[7], black: t1Players[6], outcome: 'WHITE' } // Asha (2500) beats Alireza (2767) -> UPSET!
    ];

    const r1GameIds = [];
    for (const g of t1r1Games) {
      const [gRes] = await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, ?)',
        [r1Id, g.board, g.white, g.black, 'SCHEDULED']
      );
      r1GameIds.push({ id: gRes.insertId, outcome: g.outcome });
    }

    // Insert Games for Round 2 of Tournament 1
    const t1r2Games = [
      { board: 1, white: t1Players[1], black: t1Players[2], outcome: 'WHITE' },
      { board: 2, white: t1Players[3], black: t1Players[4], outcome: 'DRAW' },
      { board: 3, white: t1Players[5], black: t1Players[0], outcome: 'WHITE' }, // Nodirbek beats Magnus!
      { board: 4, white: t1Players[6], black: t1Players[7], outcome: 'WHITE' }
    ];

    const r2GameIds = [];
    for (const g of t1r2Games) {
      const [gRes] = await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, ?)',
        [r2Id, g.board, g.white, g.black, 'SCHEDULED']
      );
      r2GameIds.push({ id: gRes.insertId, outcome: g.outcome });
    }

    // Insert Games for Round 3 of Tournament 1 (scheduled, unplayed)
    const t1r3Games = [
      { board: 1, white: t1Players[0], black: t1Players[2] },
      { board: 2, white: t1Players[1], black: t1Players[3] },
      { board: 3, white: t1Players[4], black: t1Players[6] },
      { board: 4, white: t1Players[5], black: t1Players[7] }
    ];
    for (const g of t1r3Games) {
      await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, ?)',
        [r3Id, g.board, g.white, g.black, 'SCHEDULED']
      );
    }

    // Record results for Tournament 1 Rounds 1 & 2 via CALL record_result(?, ?)
    console.log('Recording game results for T1 via stored procedure CALL record_result(?, ?)...');
    for (const g of r1GameIds) {
      await conn.query('CALL record_result(?, ?)', [g.id, g.outcome]);
    }
    for (const g of r2GameIds) {
      await conn.query('CALL record_result(?, ?)', [g.id, g.outcome]);
    }

    // Create Round 1 in Tournament 3 (COMPLETED tournament flow)
    const [t3r1Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [t3Id, 1, 'SCHEDULED']
    );
    const t3r1Id = t3r1Res.insertId;

    const [t3g1] = await conn.query(
      'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, ?)',
      [t3r1Id, 1, t3Players[0], t3Players[1], 'SCHEDULED']
    );
    const [t3g2] = await conn.query(
      'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, ?)',
      [t3r1Id, 2, t3Players[2], t3Players[3], 'SCHEDULED']
    );

    await conn.query('CALL record_result(?, ?)', [t3g1.insertId, 'WHITE']);
    await conn.query('CALL record_result(?, ?)', [t3g2.insertId, 'DRAW']);

    // Complete Tournament 3 at the end
    await conn.query("UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = ?", [t3Id]);
    console.log(`Completed Tournament ${t3Id} (status COMPLETED).`);

    console.log('Demo seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding demo data:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
};

run();
