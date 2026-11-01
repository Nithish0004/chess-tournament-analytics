-- =====================================================================
-- 07_approval_profiles.sql  |  approval gate, player chess profile, dashboard views
-- MySQL 8.0.16+.  Run AFTER 01, 02, 04, 05.  Reset order: 01 -> 02 -> 04 -> 05 -> 07
--
-- New model:
--   email verified      -> status ACTIVE   (may log in and explore)
--   admin approval      -> approval_status APPROVED (may join/play, or create tournaments)
-- =====================================================================
USE chess_db;

-- ---------------------------------------------------------------------
-- 1. Approval columns on app_user
-- ---------------------------------------------------------------------
ALTER TABLE app_user
  ADD COLUMN approval_status VARCHAR(10) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN approved_by     INT NULL,
  ADD COLUMN approved_at     DATETIME NULL,
  ADD COLUMN approval_note   VARCHAR(255) NULL,
  ADD CONSTRAINT chk_user_approval CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  ADD CONSTRAINT fk_user_approver FOREIGN KEY (approved_by)
      REFERENCES app_user(user_id) ON DELETE SET NULL;

-- Existing accounts that could already log in stay approved.
UPDATE app_user SET approval_status = 'APPROVED', approved_at = NOW() WHERE status = 'ACTIVE';
-- Organizers who were waiting now simply log in as unapproved users.
UPDATE app_user SET status = 'ACTIVE' WHERE status = 'PENDING_APPROVAL';

ALTER TABLE app_user DROP CHECK chk_user_status;
ALTER TABLE app_user
  ADD CONSTRAINT chk_user_status CHECK (status IN ('PENDING_EMAIL','ACTIVE','SUSPENDED'));

-- ---------------------------------------------------------------------
-- 2. Player chess profile (phone already lives in app_user.phone)
-- ---------------------------------------------------------------------
ALTER TABLE player
  ADD COLUMN gender           VARCHAR(12) NULL,
  ADD COLUMN experience_level VARCHAR(12) NULL,
  ADD COLUMN club             VARCHAR(100) NULL,
  ADD COLUMN fide_id          VARCHAR(12) NULL,
  ADD CONSTRAINT uq_player_fide  UNIQUE (fide_id),
  ADD CONSTRAINT chk_player_gender CHECK (gender IS NULL
        OR gender IN ('MALE','FEMALE','OTHER','UNDISCLOSED')),
  ADD CONSTRAINT chk_player_experience CHECK (experience_level IS NULL
        OR experience_level IN ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'));

-- ---------------------------------------------------------------------
-- 3. Triggers that enforce the approval gate in the database
-- ---------------------------------------------------------------------
DELIMITER $$

-- 3.1 Only ADMIN or an approved, active ORGANIZER can own a new tournament
DROP TRIGGER IF EXISTS trg_tournament_bi$$
CREATE TRIGGER trg_tournament_bi
BEFORE INSERT ON tournament
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM app_user
        WHERE user_id = NEW.created_by
          AND status = 'ACTIVE'
          AND (role = 'ADMIN' OR (role = 'ORGANIZER' AND approval_status = 'APPROVED'))) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only approved organizers can create tournaments';
  END IF;
END$$

-- 3.2 Registration: same rules as 05_workflow.sql, plus a player with an account
--     must be approved (walk-in players without an account are not affected)
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

  IF EXISTS (SELECT 1 FROM app_user
              WHERE player_id = NEW.player_id
                AND (approval_status <> 'APPROVED' OR status = 'SUSPENDED')) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Player is not approved to play yet (or the account is suspended)';
  END IF;

  SET NEW.rating_at_entry = (SELECT current_rating FROM player WHERE player_id = NEW.player_id);
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 4. Views for the admin and the role dashboards
-- ---------------------------------------------------------------------

-- Accounts waiting for the admin (email verified, not yet decided)
DROP VIEW IF EXISTS v_pending_approvals;
CREATE VIEW v_pending_approvals AS
SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.organization,
       p.experience_level, p.club, p.fide_id, u.created_at
FROM app_user u
LEFT JOIN player p ON p.player_id = u.player_id
WHERE u.approval_status = 'PENDING'
  AND u.email_verified = 1
  AND u.status = 'ACTIVE'
  AND u.role IN ('ORGANIZER','PLAYER');

-- Which players an organizer may see full contact details of
-- (players enrolled in tournaments that organizer created)
CREATE VIEW v_organizer_player_access AS
SELECT DISTINCT t.created_by AS organizer_user_id, r.player_id
FROM tournament t
JOIN registration r ON r.tournament_id = t.tournament_id
WHERE t.created_by IS NOT NULL;

-- Tournaments a player can still join (shown as "new tournaments" on their dashboard)
CREATE VIEW v_open_tournaments AS
SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date,
       t.registration_deadline, t.max_players,
       (SELECT COUNT(*) FROM registration r
         WHERE r.tournament_id = t.tournament_id) AS registered
FROM tournament t
WHERE t.status = 'UPCOMING'
  AND (t.registration_deadline IS NULL OR t.registration_deadline >= CURDATE())
  AND (t.max_players IS NULL
       OR (SELECT COUNT(*) FROM registration r
            WHERE r.tournament_id = t.tournament_id) < t.max_players);

-- A player's enrolled tournaments with their standing
CREATE VIEW v_player_enrollments AS
SELECT r.player_id, t.tournament_id, t.name, t.format, t.status,
       t.start_date, t.end_date, r.registered_at,
       s.rank_no, s.points, s.played
FROM registration r
JOIN tournament t ON t.tournament_id = r.tournament_id
LEFT JOIN tournament_standings s
       ON s.tournament_id = r.tournament_id AND s.player_id = r.player_id;

-- Games still to be played in running tournaments (filter by player in the API)
CREATE VIEW v_pending_games AS
SELECT g.game_id, tr.tournament_id, t.name AS tournament_name, tr.round_no,
       g.board_no, g.status, g.white_player_id, g.black_player_id
FROM game g
JOIN tournament_round tr ON tr.round_id = g.round_id
JOIN tournament t        ON t.tournament_id = tr.tournament_id
WHERE g.status <> 'FINISHED' AND t.status = 'ONGOING';
