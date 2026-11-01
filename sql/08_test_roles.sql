-- =====================================================================
-- 08_test_roles.sql  |  checks for 07_approval_profiles.sql
-- Run on a FRESH database built from 01 -> 02 -> 04 -> 05 -> 07 (a scratch copy):
--   sed 's/chess_db/chess_scratch/g' sql/08_test_roles.sql | mysql -u root -p -t --force
-- Lines marked ERROR EXPECTED must print an error; everything else must succeed.
-- =====================================================================
USE chess_db;

-- ---- setup: 3 players (2 with accounts) and 2 organizers --------------
INSERT INTO player (name, email) VALUES
  ('Pending Player',  'pp@role.test'),
  ('Approved Player', 'ok@role.test'),
  ('Walk In Player',  'walk@role.test');

INSERT INTO app_user (email, password_hash, full_name, role, status, email_verified, player_id, approval_status)
VALUES
  ('pp@role.test',   'x', 'Pending Player',    'PLAYER',    'ACTIVE', 1,
       (SELECT player_id FROM player WHERE email = 'pp@role.test'), 'PENDING'),
  ('ok@role.test',   'x', 'Approved Player',   'PLAYER',    'ACTIVE', 1,
       (SELECT player_id FROM player WHERE email = 'ok@role.test'), 'APPROVED'),
  ('org1@role.test', 'x', 'Pending Organizer', 'ORGANIZER', 'ACTIVE', 1, NULL, 'PENDING'),
  ('org2@role.test', 'x', 'Approved Organizer','ORGANIZER', 'ACTIVE', 1, NULL, 'APPROVED');

-- ---- 1. only approved organizers can create tournaments ---------------
INSERT INTO tournament (name, format, start_date, end_date, created_by)
VALUES ('Pending Org Cup', 'SWISS', '2030-01-01', '2030-01-02',
        (SELECT user_id FROM app_user WHERE email = 'org1@role.test'));
-- ERROR EXPECTED (1644): Only approved organizers can create tournaments

INSERT INTO tournament (name, format, start_date, end_date, created_by)
VALUES ('Approved Org Cup', 'SWISS', '2030-01-01', '2030-01-02',
        (SELECT user_id FROM app_user WHERE email = 'org2@role.test'));      -- OK
SET @t = LAST_INSERT_ID();

-- ---- 2. only approved players can be registered -------------------------
INSERT INTO registration (tournament_id, player_id)
VALUES (@t, (SELECT player_id FROM player WHERE email = 'pp@role.test'));
-- ERROR EXPECTED (1644): Player is not approved to play yet (or the account is suspended)

INSERT INTO registration (tournament_id, player_id)
VALUES (@t, (SELECT player_id FROM player WHERE email = 'ok@role.test'));    -- OK
INSERT INTO registration (tournament_id, player_id)
VALUES (@t, (SELECT player_id FROM player WHERE email = 'walk@role.test'));  -- OK (no account)

-- ---- 3. a suspended player cannot be registered ---------------------------
INSERT INTO tournament (name, format, start_date, end_date, created_by)
VALUES ('Second Cup', 'SWISS', '2030-02-01', '2030-02-02',
        (SELECT user_id FROM app_user WHERE email = 'org2@role.test'));
SET @t2 = LAST_INSERT_ID();
UPDATE app_user SET status = 'SUSPENDED' WHERE email = 'ok@role.test';
INSERT INTO registration (tournament_id, player_id)
VALUES (@t2, (SELECT player_id FROM player WHERE email = 'ok@role.test'));
-- ERROR EXPECTED (1644): Player is not approved to play yet (or the account is suspended)
UPDATE app_user SET status = 'ACTIVE' WHERE email = 'ok@role.test';

-- ---- 4. profile constraints --------------------------------------------------
UPDATE player SET gender = 'ALIEN' WHERE email = 'ok@role.test';
-- ERROR EXPECTED (3819): Check constraint 'chk_player_gender' is violated
UPDATE player SET fide_id = '123456' WHERE email = 'ok@role.test';           -- OK
UPDATE player SET fide_id = '123456' WHERE email = 'pp@role.test';
-- ERROR EXPECTED (1062): Duplicate entry '123456' for key 'player.uq_player_fide'
UPDATE app_user SET approval_status = 'MAYBE' WHERE email = 'pp@role.test';
-- ERROR EXPECTED (3819): Check constraint 'chk_user_approval' is violated

-- ---- 5. views ------------------------------------------------------------------
SELECT full_name, role FROM v_pending_approvals ORDER BY role, full_name;
-- EXPECT 2 rows: Pending Organizer (ORGANIZER), Pending Player (PLAYER)

SELECT name, registered FROM v_open_tournaments ORDER BY tournament_id;
-- EXPECT Approved Org Cup with registered = 2, Second Cup with registered = 0

SELECT name, status FROM v_player_enrollments
 WHERE player_id = (SELECT player_id FROM player WHERE email = 'ok@role.test');
-- EXPECT 1 row: Approved Org Cup, UPCOMING

SELECT p.name FROM v_organizer_player_access a JOIN player p ON p.player_id = a.player_id
 WHERE a.organizer_user_id = (SELECT user_id FROM app_user WHERE email = 'org2@role.test')
 ORDER BY p.name;
-- EXPECT 2 rows: Approved Player, Walk In Player
-- (org1 owns no tournaments, so it would see nobody)
