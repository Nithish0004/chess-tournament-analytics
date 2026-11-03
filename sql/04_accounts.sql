-- =====================================================================
-- sql/04_accounts.sql  |  Additive accounts schema (user_account table)
-- MySQL 8.0+. Run after 01_schema.sql (and 02_routines.sql)
--
-- Features:
--   - user_account table: account_id, username UNIQUE, email UNIQUE,
--     password_hash, role ENUM('PLAYER','ORGANIZER','ADMIN'),
--     player_id nullable FK to player, created_at
--   - Preserves admin_user and existing authentication tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_account (
  account_id    INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('PLAYER','ORGANIZER','ADMIN') NOT NULL,
  player_id     INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_account_player FOREIGN KEY (player_id)
      REFERENCES player(player_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Populate user_account from existing app_user if present
INSERT IGNORE INTO user_account (username, email, password_hash, role, player_id, created_at)
SELECT
  COALESCE(username, CONCAT('user_', user_id)),
  email,
  COALESCE(password_hash, ''),
  CASE
    WHEN role IN ('PLAYER','ORGANIZER','ADMIN') THEN role
    ELSE 'PLAYER'
  END,
  player_id,
  created_at
FROM app_user
WHERE email IS NOT NULL;
