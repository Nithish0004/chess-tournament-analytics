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
       VALUES (?, ?, ?, ?, ?)`,
      ['Tata Steel Masters 2026', 'ROUND_ROBIN', '2026-01-15', '2026-02-01', 'ONGOING']
    );
    const t1Id = t1Res.insertId;

    // Tournament 2: FIDE Candidates 2026 (UPCOMING)
    const [t2Res] = await conn.query(
      `INSERT INTO tournament (name, format, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      ['FIDE Candidates 2026', 'ROUND_ROBIN', '2026-04-01', '2026-04-25', 'UPCOMING']
    );
    const t2Id = t2Res.insertId;

    console.log(`Created Tournaments: T1 (ID: ${t1Id}) and T2 (ID: ${t2Id}).`);

    // Register players 1-8 and player 16 (Asha, rating 2500 for upset potential) to Tournament 1
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

    // Create Round 1 in Tournament 2
    const [t2r1Res] = await conn.query(
      'INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (?, ?, ?)',
      [t2Id, 1, 'SCHEDULED']
    );
    const t2r1Id = t2r1Res.insertId;

    // Insert Games for Round 1 of Tournament 1
    // Board 1: Magnus (p0: 2832) vs Hikaru (p1: 2802)
    // Board 2: Fabiano (p2: 2805) vs Gukesh (p3: 2794)
    // Board 3: Arjun (p4: 2797) vs Nodirbek (p5: 2783)
    // Board 4: Asha (p15: 2500) vs Alireza (p6: 2767) -> UPSET match! (gap > 200)
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

    // Insert scheduled games for Tournament 2 Round 1 (unplayed)
    for (let i = 0; i < 4; i++) {
      await conn.query(
        'INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status) VALUES (?, ?, ?, ?, ?)',
        [t2r1Id, i + 1, t2Players[i * 2], t2Players[i * 2 + 1], 'SCHEDULED']
      );
    }

    // Record results strictly through CALL record_result(?, ?)
    console.log('Recording game results via stored procedure CALL record_result(?, ?)...');
    for (const g of r1GameIds) {
      await conn.query('CALL record_result(?, ?)', [g.id, g.outcome]);
      console.log(`Recorded result for Game ${g.id}: ${g.outcome}`);
    }

    for (const g of r2GameIds) {
      await conn.query('CALL record_result(?, ?)', [g.id, g.outcome]);
      console.log(`Recorded result for Game ${g.id}: ${g.outcome}`);
    }

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
