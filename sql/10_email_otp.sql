-- =====================================================================
-- 10_email_otp.sql  |  one-time codes for e-mail verification and password reset
-- MySQL 8.0.16+.  Run AFTER 01, 02, 04, 05, 07, 09.
-- Reset order: 01 -> 02 -> 04 -> 05 -> 07 -> 09 -> 10
--
-- Only a keyed hash of each code is stored (never the code itself).
-- The database also enforces: a used code can never be touched again, and the
-- number of wrong attempts can never exceed the allowed maximum.
-- =====================================================================
USE chess_db;

CREATE TABLE email_otp (
  otp_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  purpose      VARCHAR(16) NOT NULL,
  code_hash    CHAR(64) NOT NULL,
  expires_at   DATETIME NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  used_at      DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_otp_purpose  CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
  CONSTRAINT chk_otp_attempts CHECK (attempts >= 0 AND max_attempts BETWEEN 1 AND 10),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id)
      REFERENCES app_user(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_otp_lookup  ON email_otp (user_id, purpose, created_at);
CREATE INDEX idx_otp_expires ON email_otp (expires_at);

DELIMITER $$

DROP TRIGGER IF EXISTS trg_email_otp_bu$$
CREATE TRIGGER trg_email_otp_bu
BEFORE UPDATE ON email_otp
FOR EACH ROW
BEGIN
  IF OLD.used_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This code was already used';
  END IF;
  IF NEW.attempts > NEW.max_attempts THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Too many wrong attempts for this code';
  END IF;
END$$

DELIMITER ;

-- Deletes codes that expired or were used more than a day ago.
CREATE PROCEDURE purge_email_otps()
  DELETE FROM email_otp
   WHERE expires_at < NOW() - INTERVAL 1 DAY
      OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL 1 DAY);
