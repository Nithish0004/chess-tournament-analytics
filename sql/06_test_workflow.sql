-- =====================================================================
-- 06_test_workflow.sql  |  checks for the rules in 05_workflow.sql
-- Run on a FRESH database built from 01 -> 02 -> 04 -> 05 (a scratch copy is
-- ideal). Run it with:  mysql -u root -p -t --force < 06_test_workflow.sql
-- Lines marked "ERROR EXPECTED" must print an ERROR 1644 (or the stated one).
-- =====================================================================
USE chess_db;

-- ---- setup: 5 players, one tournament with capacity 4 ---------------
INSERT INTO player (name, email, current_rating) VALUES
  ('P1', 'p1@wf.test', 1500), ('P2', 'p2@wf.test', 1700),
  ('P3', 'p3@wf.test', 1500), ('P4', 'p4@wf.test', 1200),
  ('P5', 'p5@wf.test', 1300);

INSERT INTO tournament (name, format, start_date, end_date, status, max_players, rounds_planned)
VALUES ('Workflow Cup', 'ROUND_ROBIN', '2030-12-31', '2031-01-02', 'UPCOMING', 4, 1);

-- ---- 1. nothing can start before it is ONGOING -----------------------
INSERT INTO tournament_round (tournament_id, round_no) VALUES (1, 1);
-- ERROR EXPECTED: Rounds can only be created while the tournament is ONGOING

UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = 1;
-- ERROR EXPECTED: At least 2 registered players are needed to start the tournament

-- ---- 2. registration and capacity -------------------------------------
INSERT INTO registration (tournament_id, player_id) VALUES (1,1),(1,2),(1,3),(1,4);
SELECT registration_id, player_id, rating_at_entry FROM registration;   -- EXPECT 4 rows, ratings filled

INSERT INTO registration (tournament_id, player_id) VALUES (1,5);
-- ERROR EXPECTED: Tournament is full

-- ---- 3. status machine ------------------------------------------------
UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = 1;
-- ERROR EXPECTED: Invalid status change (UPCOMING cannot jump to COMPLETED)

UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = 1;        -- OK
SELECT tournament_id, status FROM tournament;                            -- EXPECT ONGOING

INSERT INTO registration (tournament_id, player_id) VALUES (1,5);
-- ERROR EXPECTED: Registration is closed: the tournament is not UPCOMING

-- ---- 4. rounds and pairing rules ---------------------------------------
INSERT INTO tournament_round (tournament_id, round_no) VALUES (1, 1);    -- OK
INSERT INTO tournament_round (tournament_id, round_no) VALUES (1, 2);
-- ERROR EXPECTED: Round number exceeds the planned number of rounds

INSERT INTO game (round_id, board_no, white_player_id, black_player_id) VALUES (1,1,1,2);   -- OK
INSERT INTO game (round_id, board_no, white_player_id, black_player_id) VALUES (1,2,1,3);
-- ERROR EXPECTED: A player is already paired in this round
INSERT INTO game (round_id, board_no, white_player_id, black_player_id) VALUES (1,2,3,5);
-- ERROR EXPECTED: Both players must be registered in this tournament
INSERT INTO game (round_id, board_no, white_player_id, black_player_id) VALUES (1,2,3,4);   -- OK

-- ---- 5. cannot complete with unfinished games --------------------------
UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = 1;
-- ERROR EXPECTED: Cannot complete: some games are not finished yet

SELECT * FROM v_tournament_progress;
-- EXPECT registered 4, rounds_created 1, games_total 2, games_finished 0

-- ---- 6. record results, then complete ------------------------------------
CALL record_result(1, 'WHITE');     -- P1 (1500) beats P2 (1700): upset
CALL record_result(2, 'DRAW');
SELECT * FROM v_tournament_progress;            -- EXPECT games_finished 2
SELECT round_id, status FROM tournament_round;  -- EXPECT COMPLETED

UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = 1;      -- OK
SELECT tournament_id, status FROM tournament;                            -- EXPECT COMPLETED

UPDATE tournament SET status = 'ONGOING' WHERE tournament_id = 1;
-- ERROR EXPECTED: Invalid status change (a completed tournament cannot be reopened)

-- ---- 7. results only while ONGOING ----------------------------------------
-- (a second tournament that is still UPCOMING cannot receive results; a completed one neither)
INSERT INTO tournament (name, format, start_date, end_date, status)
VALUES ('Late Cup', 'ROUND_ROBIN', '2020-01-02', '2020-01-03', 'UPCOMING');
UPDATE tournament SET registration_deadline = '2020-01-01' WHERE tournament_id = 2;
INSERT INTO registration (tournament_id, player_id) VALUES (2,1);
-- ERROR EXPECTED: Registration deadline has passed

-- ---- 8. predictions must come before results ------------------------------
INSERT INTO ml_model_version (version_tag, algorithm, sample_count)
VALUES ('test-v1', 'logreg', 100);
INSERT INTO game_prediction (game_id, model_version_id, p_white_win, p_draw, p_black_win, predicted_class)
VALUES (1, 1, 0.3000, 0.2000, 0.5000, 'BLACK');
-- ERROR EXPECTED: A prediction must be stored before the game result exists
INSERT INTO game_prediction (game_id, model_version_id, p_white_win, p_draw, p_black_win, predicted_class)
VALUES (1, 1, 0.5000, 0.5000, 0.5000, 'WHITE');
-- ERROR EXPECTED: Check constraint 'chk_pred_probs' is violated (probabilities must sum to 1)
