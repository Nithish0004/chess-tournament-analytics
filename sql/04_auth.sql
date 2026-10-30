-- =====================================================================
-- 04_auth.sql  |  Users, roles, email verification, password reset
-- MySQL 8.0.16+.  Run AFTER 01_schema.sql and 02_routines.sql:
--   mysql -u root -p < sql/04_auth.sql
-- Reset order from now on: 01 -> 02 -> 04  (01 drops the whole database)
-- =====================================================================
USE chess_db;

-- ---------------------------------------------------------------------
-- APP_USER: one row per login account (replaces admin_user)
--   role   : ADMIN (seeded only), ORGANIZER, PLAYER
--   status : PENDING_EMAIL    -> registered, e-mail not yet verified
--            PENDING_APPROVAL -> organizer verified, waiting for admin
--            ACTIVE           -> may enter the dashboard
--            SUSPENDED        -> blocked by admin
--   password_hash is NULL for accounts that only use Google sign-in.
--   player_id links a PLAYER account to its row in the player table.
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255),
  full_name      VARCHAR(100) NOT NULL,
  role           VARCHAR(10)  NOT NULL,
  status         VARCHAR(16)  NOT NULL DEFAULT 'PENDING_EMAIL',
  email_verified TINYINT(1)   NOT NULL DEFAULT 0,
  phone          VARCHAR(20),
  organization   VARCHAR(120),
  player_id      INT NULL UNIQUE,
  google_sub     VARCHAR(64) NULL UNIQUE,
  failed_logins  INT NOT NULL DEFAULT 0,
  locked_until   DATETIME NULL,
  last_login_at  DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_user_role   CHECK (role IN ('ADMIN','ORGANIZER','PLAYER')),
  CONSTRAINT chk_user_status CHECK (status IN
        ('PENDING_EMAIL','PENDING_APPROVAL','ACTIVE','SUSPENDED')),
  CONSTRAINT chk_user_verified CHECK (email_verified IN (0,1)),
  CONSTRAINT chk_user_login_method CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL),
  CONSTRAINT fk_user_player FOREIGN KEY (player_id)
      REFERENCES player(player_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- AUTH_TOKEN: e-mail verification and password-reset links.
-- Only the SHA-256 hash of the token is stored, never the token itself,
-- so a database leak does not expose working links.
-- ---------------------------------------------------------------------
CREATE TABLE auth_token (
  token_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose    VARCHAR(16) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_token_purpose CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
  CONSTRAINT fk_token_user FOREIGN KEY (user_id)
      REFERENCES app_user(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_token_user    ON auth_token (user_id, purpose);
CREATE INDEX idx_token_expires ON auth_token (expires_at);
CREATE INDEX idx_user_status   ON app_user (status, role);

-- ---------------------------------------------------------------------
-- Tournament ownership: organizers manage only tournaments they created.
-- ---------------------------------------------------------------------
ALTER TABLE tournament
  ADD COLUMN created_by INT NULL,
  ADD CONSTRAINT fk_tournament_creator FOREIGN KEY (created_by)
      REFERENCES app_user(user_id) ON DELETE SET NULL;

CREATE INDEX idx_tournament_creator ON tournament (created_by);

-- ---------------------------------------------------------------------
-- View + maintenance procedure
-- ---------------------------------------------------------------------
CREATE VIEW v_pending_approvals AS
SELECT user_id, full_name, email, organization, phone, created_at
FROM app_user
WHERE status = 'PENDING_APPROVAL' AND role = 'ORGANIZER';

-- Deletes expired or already-used tokens older than 7 days.
CREATE PROCEDURE purge_auth_tokens()
  DELETE FROM auth_token
   WHERE expires_at < NOW() - INTERVAL 7 DAY
      OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL 7 DAY);

-- The old admin_user table is replaced by app_user. Drop it only after the
-- API has been switched over and seed-admin.js creates admins in app_user:
-- DROP TABLE admin_user;
