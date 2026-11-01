-- =====================================================================
-- 05_workflow.sql  |  tournament workflow rules, audit log, ML tables
-- MySQL 8.0.16+.  Run AFTER 01, 02 and 04.  Reset order: 01 -> 02 -> 04 -> 05
--
-- What it enforces in the database (so no client can bypass it):
--   * status moves only UPCOMING -> ONGOING -> COMPLETED
--   * start needs >= 2 registered players; complete needs all games FINISHED
--   * registration only while UPCOMING, before the deadline, below capacity
--   * rounds, games and results only while the tournament is ONGOING
--   * a player can appear in only one game per round
--   * predictions can only be stored before the game has a result
-- =====================================================================
USE chess_db;

-- ---------------------------------------------------------------------
-- 1. Tournament settings (all nullable, so old rows stay valid)
-- ---------------------------------------------------------------------
ALTER TABLE tournament
  ADD COLUMN max_players           INT  NULL,
  ADD COLUMN registration_deadline DATE NULL,
  ADD COLUMN rounds_planned        INT  NULL,
  ADD CONSTRAINT chk_t_max_players  CHECK (max_players IS NULL OR max_players >= 2),
  ADD CONSTRAINT chk_t_rounds       CHECK (rounds_planned IS NULL OR rounds_planned >= 1),
  ADD CONSTRAINT chk_t_deadline     CHECK (registration_deadline IS NULL
                                           OR registration_deadline <= start_date);

-- ---------------------------------------------------------------------
-- 2. Audit log: who did what, when (written by the API)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  log_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action        VARCHAR(40) NOT NULL,
  entity        VARCHAR(30) NOT NULL,
  entity_id     INT NULL,
  details       JSON NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id)
      REFERENCES app_user(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);
CREATE INDEX idx_audit_actor  ON audit_log (actor_user_id, created_at);

-- ---------------------------------------------------------------------
-- 3. ML tables: versioned models and per-game three-way forecasts
-- ---------------------------------------------------------------------
CREATE TABLE ml_model_version (
  model_version_id INT AUTO_INCREMENT PRIMARY KEY,
  version_tag      VARCHAR(30) NOT NULL UNIQUE,
  algorithm        VARCHAR(40) NOT NULL,
  train_end_time   DATETIME NULL,
  sample_count     INT NOT NULL,
  validation_metrics JSON NULL,
  artifact_path    VARCHAR(255),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE game_prediction (
  prediction_id    INT AUTO_INCREMENT PRIMARY KEY,
  game_id          INT NOT NULL,
  model_version_id INT NOT NULL,
  predicted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  p_white_win      DECIMAL(5,4) NOT NULL,
  p_draw           DECIMAL(5,4) NOT NULL,
  p_black_win      DECIMAL(5,4) NOT NULL,
  predicted_class  VARCHAR(5) NOT NULL,
  CONSTRAINT uq_game_model UNIQUE (game_id, model_version_id),
  CONSTRAINT chk_pred_probs CHECK (
      p_white_win BETWEEN 0 AND 1 AND p_draw BETWEEN 0 AND 1 AND p_black_win BETWEEN 0 AND 1
      AND ABS(p_white_win + p_draw + p_black_win - 1) <= 0.001),
  CONSTRAINT chk_pred_class CHECK (predicted_class IN ('WHITE','DRAW','BLACK')),
  CONSTRAINT fk_gp_game  FOREIGN KEY (game_id) REFERENCES game(game_id) ON DELETE CASCADE,
  CONSTRAINT fk_gp_model FOREIGN KEY (model_version_id) REFERENCES ml_model_version(model_version_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. Progress view (used by the UI to enable Start / Complete / Generate)
-- ---------------------------------------------------------------------
CREATE VIEW v_tournament_progress AS
SELECT t.tournament_id, t.name, t.status, t.max_players, t.rounds_planned,
       t.registration_deadline,
       (SELECT COUNT(*) FROM registration r
         WHERE r.tournament_id = t.tournament_id)                      AS registered,
       (SELECT COUNT(*) FROM tournament_round tr
         WHERE tr.tournament_id = t.tournament_id)                     AS rounds_created,
       (SELECT COUNT(*) FROM game g JOIN tournament_round tr ON tr.round_id = g.round_id
         WHERE tr.tournament_id = t.tournament_id)                     AS games_total,
       (SELECT COUNT(*) FROM game g JOIN tournament_round tr ON tr.round_id = g.round_id
         WHERE tr.tournament_id = t.tournament_id
           AND g.status = 'FINISHED')                                  AS games_finished
FROM tournament t;

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------
DELIMITER $$

-- 5.1 Status machine: UPCOMING -> ONGOING -> COMPLETED only
DROP TRIGGER IF EXISTS trg_tournament_bu$$
CREATE TRIGGER trg_tournament_bu
BEFORE UPDATE ON tournament
FOR EACH ROW
BEGIN
  DECLARE v_cnt INT;
  IF NEW.status <> OLD.status THEN
    IF NOT ((OLD.status = 'UPCOMING' AND NEW.status = 'ONGOING')
         OR (OLD.status = 'ONGOING'  AND NEW.status = 'COMPLETED')) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid status change: allowed order is UPCOMING, ONGOING, COMPLETED';
    END IF;

    IF NEW.status = 'ONGOING' THEN
      SELECT COUNT(*) INTO v_cnt FROM registration WHERE tournament_id = OLD.tournament_id;
      IF v_cnt < 2 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'At least 2 registered players are needed to start the tournament';
      END IF;
    END IF;

    IF NEW.status = 'COMPLETED' THEN
      SELECT COUNT(*) INTO v_cnt
        FROM game g JOIN tournament_round tr ON tr.round_id = g.round_id
       WHERE tr.tournament_id = OLD.tournament_id AND g.status <> 'FINISHED';
      IF v_cnt > 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Cannot complete: some games are not finished yet';
      END IF;
    END IF;
  END IF;
END$$

-- 5.2 Registration: only UPCOMING, before the deadline, below capacity.
--     The tournament row is locked so two simultaneous sign-ups cannot exceed capacity.
DROP TRIGGER IF EXISTS trg_registration_bi$$
CREATE TRIGGER trg_registration_bi
BEFORE INSERT ON registration
FOR EACH ROW
BEGIN
  DECLARE v_status   VARCHAR(10);
  DECLARE v_max      INT;
  DECLARE v_deadline DATE;
  DECLARE v_cnt      INT;

  SELECT status, max_players, registration_deadline
    INTO v_status, v_max, v_deadline
    FROM tournament
   WHERE tournament_id = NEW.tournament_id
     FOR UPDATE;

  IF v_status <> 'UPCOMING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Registration is closed: the tournament is not UPCOMING';
  END IF;
  IF v_deadline IS NOT NULL AND CURDATE() > v_deadline THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration deadline has passed';
  END IF;
  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cnt FROM registration WHERE tournament_id = NEW.tournament_id;
    IF v_cnt >= v_max THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament is full';
    END IF;
  END IF;

  SET NEW.rating_at_entry = (SELECT current_rating FROM player WHERE player_id = NEW.player_id);
END$$

-- 5.3 Rounds only while ONGOING and not beyond rounds_planned
DROP TRIGGER IF EXISTS trg_round_bi$$
CREATE TRIGGER trg_round_bi
BEFORE INSERT ON tournament_round
FOR EACH ROW
BEGIN
  DECLARE v_status  VARCHAR(10);
  DECLARE v_planned INT;
  SELECT status, rounds_planned INTO v_status, v_planned
    FROM tournament WHERE tournament_id = NEW.tournament_id;
  IF v_status <> 'ONGOING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Rounds can only be created while the tournament is ONGOING';
  END IF;
  IF v_planned IS NOT NULL AND NEW.round_no > v_planned THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Round number exceeds the planned number of rounds';
  END IF;
END$$

-- 5.4 Games: tournament ONGOING, both players registered, nobody paired twice in a round
DROP TRIGGER IF EXISTS trg_game_bi$$
CREATE TRIGGER trg_game_bi
BEFORE INSERT ON game
FOR EACH ROW
BEGIN
  DECLARE v_tid    INT;
  DECLARE v_status VARCHAR(10);
  DECLARE v_cnt    INT;

  SELECT tr.tournament_id, t.status INTO v_tid, v_status
    FROM tournament_round tr
    JOIN tournament t ON t.tournament_id = tr.tournament_id
   WHERE tr.round_id = NEW.round_id;

  IF v_status <> 'ONGOING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Games can only be created while the tournament is ONGOING';
  END IF;

  SELECT COUNT(*) INTO v_cnt
    FROM registration
   WHERE tournament_id = v_tid
     AND player_id IN (NEW.white_player_id, NEW.black_player_id);
  IF v_cnt <> 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Both players must be registered in this tournament';
  END IF;

  SELECT COUNT(*) INTO v_cnt
    FROM game
   WHERE round_id = NEW.round_id
     AND (white_player_id IN (NEW.white_player_id, NEW.black_player_id)
       OR black_player_id IN (NEW.white_player_id, NEW.black_player_id));
  IF v_cnt > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A player is already paired in this round';
  END IF;
END$$

-- 5.5 Results only while the tournament is ONGOING
--     (the update/delete triggers from 02_routines.sql still make results immutable)
DROP TRIGGER IF EXISTS trg_result_bi$$
CREATE TRIGGER trg_result_bi
BEFORE INSERT ON result
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  SELECT t.status INTO v_status
    FROM game g
    JOIN tournament_round tr ON tr.round_id = g.round_id
    JOIN tournament t        ON t.tournament_id = tr.tournament_id
   WHERE g.game_id = NEW.game_id;
  IF v_status <> 'ONGOING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Results can only be recorded while the tournament is ONGOING';
  END IF;
END$$

-- 5.6 A forecast must be made before the game has a result
DROP TRIGGER IF EXISTS trg_prediction_bi$$
CREATE TRIGGER trg_prediction_bi
BEFORE INSERT ON game_prediction
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM result WHERE game_id = NEW.game_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A prediction must be stored before the game result exists';
  END IF;
END$$

DELIMITER ;
