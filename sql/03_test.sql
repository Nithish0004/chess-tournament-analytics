-- =====================================================================
-- 03_test.sql  |  quick checks for the database layer
-- Run statement by statement in MySQL Workbench and compare with the
-- "EXPECT" comments. Re-run 01_schema.sql first to reset the data.
-- =====================================================================
USE chess_db;

-- ---- setup ----------------------------------------------------------
INSERT INTO player (name, email, current_rating) VALUES
  ('Asha',  'asha@example.com',  1500),
  ('Bharat','bharat@example.com',1700),
  ('Chitra','chitra@example.com',1500),
  ('Dev',   'dev@example.com',   1200);

INSERT INTO tournament (name, format, start_date, end_date, status)
VALUES ('Club Open 2026', 'ROUND_ROBIN', '2026-11-01', '2026-11-03', 'ONGOING');

INSERT INTO registration (tournament_id, player_id) VALUES (1,1),(1,2),(1,3),(1,4);
SELECT * FROM registration;               -- EXPECT: rating_at_entry filled by trigger

INSERT INTO tournament_round (tournament_id, round_no) VALUES (1,1);

-- Asha (white, 1500) vs Bharat (black, 1700);  Chitra vs Dev (equal-ish)
INSERT INTO game (round_id, board_no, white_player_id, black_player_id) VALUES
  (1,1,1,2),
  (1,2,3,4);

-- ---- 1. upset + Elo --------------------------------------------------
CALL record_result(1, 'WHITE');           -- Asha (1500) beats Bharat (1700)
SELECT player_id, name, current_rating FROM player;
-- EXPECT: Asha 1524, Bharat 1676 (about +24 / -24)
SELECT game_id, outcome, is_upset FROM result;           -- EXPECT: is_upset = 1
SELECT * FROM v_upsets;                                   -- EXPECT: 1 row, gap 200

-- ---- 2. draw is never an upset --------------------------------------
CALL record_result(2, 'DRAW');            -- Chitra 1500 draws Dev 1200
SELECT game_id, outcome, is_upset FROM result WHERE game_id = 2;   -- EXPECT: 0
SELECT * FROM rating_history ORDER BY history_id;
-- EXPECT: Chitra loses points, Dev gains (the lower-rated player gains on a draw)

-- ---- 3. standings and round status ----------------------------------
SELECT * FROM v_leaderboard WHERE tournament_id = 1 ORDER BY rank_no;
-- EXPECT: Asha 1.0 (rank 1), Chitra 0.5 and Dev 0.5 (rank 2), Bharat 0 (rank 4)
SELECT round_id, status FROM tournament_round;            -- EXPECT: COMPLETED

-- ---- 4. analytics views ---------------------------------------------
SELECT * FROM v_player_performance;
SELECT * FROM v_rating_progression ORDER BY player_id, game_no;

-- ---- 5. error cases (each should FAIL with an error) ----------------
CALL record_result(1, 'WHITE');           -- already recorded
CALL record_result(999, 'WHITE');         -- game not found
CALL record_result(1, 'WIN');             -- invalid outcome
INSERT INTO registration (tournament_id, player_id) VALUES (1,1);      -- duplicate (UNIQUE)
INSERT INTO game (round_id, board_no, white_player_id, black_player_id) VALUES (1,3,1,1); -- same player (CHECK)
UPDATE result SET outcome = 'BLACK' WHERE game_id = 1;                 -- immutable (trigger)
INSERT INTO tournament (name, format, start_date, end_date)
VALUES ('Bad', 'LEAGUE', '2026-11-01', '2026-11-02');                   -- invalid format (CHECK)
