-- =====================================================================
-- 02_routines.sql  |  stored procedures, triggers, views (MySQL 8)
-- Run in MySQL Workbench or the mysql CLI (DELIMITER is a client command,
-- so this file cannot be run through the Node mysql2 driver).
-- =====================================================================
USE chess_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- refresh_standings: rebuilds the standings of one tournament.
-- Called from record_result, so it runs inside that transaction.
-- ---------------------------------------------------------------------
CREATE PROCEDURE refresh_standings(IN p_tid INT)
BEGIN
  DELETE FROM tournament_standings WHERE tournament_id = p_tid;

  INSERT INTO tournament_standings
        (tournament_id, player_id, played, wins, draws, losses, points, rank_no)
  SELECT p_tid,
         reg.player_id,
         COALESCE(a.played, 0),
         COALESCE(a.wins, 0),
         COALESCE(a.draws, 0),
         COALESCE(a.losses, 0),
         COALESCE(a.points, 0),
         RANK() OVER (ORDER BY COALESCE(a.points, 0) DESC, COALESCE(a.wins, 0) DESC)
  FROM registration reg
  LEFT JOIN (
      SELECT x.player_id,
             COUNT(*)           AS played,
             SUM(x.score = 1)   AS wins,
             SUM(x.score = 0.5) AS draws,
             SUM(x.score = 0)   AS losses,
             SUM(x.score)       AS points
      FROM (
          SELECT g.white_player_id AS player_id,
                 CASE r.outcome WHEN 'WHITE' THEN 1 WHEN 'DRAW' THEN 0.5 ELSE 0 END AS score
          FROM game g
          JOIN tournament_round tr ON tr.round_id = g.round_id
          JOIN result r            ON r.game_id  = g.game_id
          WHERE tr.tournament_id = p_tid
          UNION ALL
          SELECT g.black_player_id,
                 CASE r.outcome WHEN 'BLACK' THEN 1 WHEN 'DRAW' THEN 0.5 ELSE 0 END
          FROM game g
          JOIN tournament_round tr ON tr.round_id = g.round_id
          JOIN result r            ON r.game_id  = g.game_id
          WHERE tr.tournament_id = p_tid
      ) x
      GROUP BY x.player_id
  ) a ON a.player_id = reg.player_id
  WHERE reg.tournament_id = p_tid;
END$$

-- ---------------------------------------------------------------------
-- record_result: the heart of the project. One atomic transaction:
--   validate -> lock players -> Elo -> upset flag -> result -> ratings
--   -> rating_history -> game status -> round status -> standings.
-- ---------------------------------------------------------------------
CREATE PROCEDURE record_result(IN p_game_id INT, IN p_outcome VARCHAR(5))
BEGIN
  DECLARE v_white INT;
  DECLARE v_black INT;
  DECLARE v_round INT;
  DECLARE v_tid   INT;
  DECLARE ra INT;
  DECLARE rb INT;
  DECLARE ea DOUBLE;
  DECLARE sa DOUBLE;
  DECLARE da INT;
  DECLARE db INT;
  DECLARE v_upset TINYINT DEFAULT 0;
  DECLARE k   INT DEFAULT 32;    -- K-factor
  DECLARE thr INT DEFAULT 100;   -- upset threshold (rating points)

  -- any error: undo everything and pass the error to the caller
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_outcome NOT IN ('WHITE','BLACK','DRAW') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Outcome must be WHITE, BLACK or DRAW';
  END IF;

  START TRANSACTION;

  SELECT g.white_player_id, g.black_player_id, g.round_id, tr.tournament_id
    INTO v_white, v_black, v_round, v_tid
    FROM game g
    JOIN tournament_round tr ON tr.round_id = g.round_id
   WHERE g.game_id = p_game_id
     FOR UPDATE;

  IF v_white IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game not found';
  END IF;

  IF EXISTS (SELECT 1 FROM result WHERE game_id = p_game_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result already recorded for this game';
  END IF;

  -- lock both player rows, always lowest id first (prevents deadlocks)
  IF v_white < v_black THEN
    SELECT current_rating INTO ra FROM player WHERE player_id = v_white FOR UPDATE;
    SELECT current_rating INTO rb FROM player WHERE player_id = v_black FOR UPDATE;
  ELSE
    SELECT current_rating INTO rb FROM player WHERE player_id = v_black FOR UPDATE;
    SELECT current_rating INTO ra FROM player WHERE player_id = v_white FOR UPDATE;
  END IF;

  -- Elo: expected score of white, actual score of white, rating change
  SET ea = 1 / (1 + POW(10, (rb - ra) / 400));
  SET sa = CASE p_outcome WHEN 'WHITE' THEN 1 WHEN 'DRAW' THEN 0.5 ELSE 0 END;
  SET da = ROUND(k * (sa - ea));
  SET db = -da;                                  -- zero-sum

  -- upset: winner was rated at least thr points below the loser
  IF p_outcome = 'WHITE' AND (rb - ra) >= thr THEN SET v_upset = 1; END IF;
  IF p_outcome = 'BLACK' AND (ra - rb) >= thr THEN SET v_upset = 1; END IF;

  INSERT INTO result (game_id, outcome, is_upset)
  VALUES (p_game_id, p_outcome, v_upset);

  UPDATE player SET current_rating = ra + da WHERE player_id = v_white;
  UPDATE player SET current_rating = rb + db WHERE player_id = v_black;

  INSERT INTO rating_history (player_id, game_id, old_rating, new_rating, rating_change)
  VALUES (v_white, p_game_id, ra, ra + da, da),
         (v_black, p_game_id, rb, rb + db, db);

  UPDATE game
     SET status = 'FINISHED', end_time = NOW()
   WHERE game_id = p_game_id;

  -- close the round when every game in it is finished
  UPDATE tournament_round
     SET status = 'COMPLETED'
   WHERE round_id = v_round
     AND NOT EXISTS (SELECT 1 FROM game WHERE round_id = v_round AND status <> 'FINISHED');

  CALL refresh_standings(v_tid);

  COMMIT;
END$$

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------

-- 1. Registration: no entry into a completed tournament; snapshot rating.
CREATE TRIGGER trg_registration_bi
BEFORE INSERT ON registration
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  SELECT status INTO v_status FROM tournament WHERE tournament_id = NEW.tournament_id;
  IF v_status = 'COMPLETED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament already completed';
  END IF;
  SET NEW.rating_at_entry = (SELECT current_rating FROM player WHERE player_id = NEW.player_id);
END$$

-- 2. Game: both players must be registered in the round's tournament.
CREATE TRIGGER trg_game_bi
BEFORE INSERT ON game
FOR EACH ROW
BEGIN
  DECLARE v_tid INT;
  DECLARE v_cnt INT;
  SELECT tournament_id INTO v_tid FROM tournament_round WHERE round_id = NEW.round_id;
  SELECT COUNT(*) INTO v_cnt
    FROM registration
   WHERE tournament_id = v_tid
     AND player_id IN (NEW.white_player_id, NEW.black_player_id);
  IF v_cnt <> 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both players must be registered in this tournament';
  END IF;
END$$

-- 3 & 4. Recorded results are immutable (keeps rating history consistent).
CREATE TRIGGER trg_result_bu
BEFORE UPDATE ON result
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recorded results cannot be modified';
END$$

CREATE TRIGGER trg_result_bd
BEFORE DELETE ON result
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recorded results cannot be deleted';
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- VIEWS (used by the analytics endpoints and dashboard)
-- ---------------------------------------------------------------------

-- One row per (player, game) with the player's score in that game.
CREATE VIEW v_player_games AS
SELECT g.game_id, tr.tournament_id,
       g.white_player_id AS player_id, g.black_player_id AS opponent_id,
       CASE r.outcome WHEN 'WHITE' THEN 1 WHEN 'DRAW' THEN 0.5 ELSE 0 END AS score
FROM game g
JOIN tournament_round tr ON tr.round_id = g.round_id
JOIN result r            ON r.game_id  = g.game_id
UNION ALL
SELECT g.game_id, tr.tournament_id,
       g.black_player_id, g.white_player_id,
       CASE r.outcome WHEN 'BLACK' THEN 1 WHEN 'DRAW' THEN 0.5 ELSE 0 END
FROM game g
JOIN tournament_round tr ON tr.round_id = g.round_id
JOIN result r            ON r.game_id  = g.game_id;

-- Player performance summary (win/draw/loss %, avg opponent rating, net change)
CREATE VIEW v_player_performance AS
SELECT p.player_id,
       p.name,
       p.current_rating,
       COUNT(pg.game_id)                                                AS games_played,
       COALESCE(SUM(pg.score = 1), 0)                                   AS wins,
       COALESCE(SUM(pg.score = 0.5), 0)                                 AS draws,
       COALESCE(SUM(pg.score = 0), 0)                                   AS losses,
       ROUND(100 * SUM(pg.score = 1)   / NULLIF(COUNT(pg.game_id), 0), 1) AS win_pct,
       ROUND(100 * SUM(pg.score = 0.5) / NULLIF(COUNT(pg.game_id), 0), 1) AS draw_pct,
       ROUND(100 * SUM(pg.score = 0)   / NULLIF(COUNT(pg.game_id), 0), 1) AS loss_pct,
       ROUND(AVG(oh.old_rating))                                        AS avg_opponent_rating,
       (SELECT COALESCE(SUM(rh.rating_change), 0)
          FROM rating_history rh WHERE rh.player_id = p.player_id)      AS net_rating_change
FROM player p
LEFT JOIN v_player_games pg ON pg.player_id = p.player_id
LEFT JOIN rating_history oh ON oh.player_id = pg.opponent_id AND oh.game_id = pg.game_id
GROUP BY p.player_id, p.name, p.current_rating;

-- Rating progression with window functions (for the line chart)
CREATE VIEW v_rating_progression AS
SELECT rh.player_id, p.name, rh.game_id, rh.recorded_at,
       rh.old_rating, rh.new_rating, rh.rating_change,
       ROW_NUMBER() OVER (PARTITION BY rh.player_id ORDER BY rh.history_id) AS game_no,
       AVG(rh.new_rating) OVER (PARTITION BY rh.player_id ORDER BY rh.history_id
                                ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)   AS moving_avg_5
FROM rating_history rh
JOIN player p ON p.player_id = rh.player_id;

-- Upset victories with winner/loser names
CREATE VIEW v_upsets AS
SELECT tr.tournament_id, g.game_id,
       w.name AS winner, wh.old_rating AS winner_rating,
       l.name AS loser,  lh.old_rating AS loser_rating,
       (lh.old_rating - wh.old_rating) AS rating_gap
FROM result r
JOIN game g              ON g.game_id = r.game_id
JOIN tournament_round tr ON tr.round_id = g.round_id
JOIN player w ON w.player_id = IF(r.outcome = 'WHITE', g.white_player_id, g.black_player_id)
JOIN player l ON l.player_id = IF(r.outcome = 'WHITE', g.black_player_id, g.white_player_id)
JOIN rating_history wh ON wh.game_id = g.game_id AND wh.player_id = w.player_id
JOIN rating_history lh ON lh.game_id = g.game_id AND lh.player_id = l.player_id
WHERE r.is_upset = 1;

-- Leaderboard
CREATE VIEW v_leaderboard AS
SELECT s.tournament_id, s.rank_no, p.player_id, p.name, p.current_rating,
       s.played, s.wins, s.draws, s.losses, s.points
FROM tournament_standings s
JOIN player p ON p.player_id = s.player_id;
