-- =====================================================================
-- 09_username_country.sql  |  unique usernames and ISO country codes
-- MySQL 8.0.16+.  Run AFTER 01, 02, 04, 05, 07.
-- Reset order: 01 -> 02 -> 04 -> 05 -> 07 -> 09
--
--   app_user.username      unique, case-insensitive, 3-20 letters/digits/underscore
--   *.country_code         ISO 3166-1 alpha-2 (upper case), e.g. IN, US, NO
-- The full country list (all 249+) lives in the application, so no country
-- is left out; the database guarantees the stored code is well formed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Username
-- ---------------------------------------------------------------------
ALTER TABLE app_user ADD COLUMN username VARCHAR(20) NULL;

-- Give every existing account a valid, unique username (letters of the e-mail + id).
UPDATE app_user
   SET username = CONCAT(
         COALESCE(NULLIF(LEFT(REGEXP_REPLACE(SUBSTRING_INDEX(email, '@', 1),
                                             '[^A-Za-z0-9_]', ''), 12), ''), 'user'),
         '_', user_id)
 WHERE username IS NULL;

ALTER TABLE app_user
  MODIFY username VARCHAR(20) NOT NULL,
  ADD CONSTRAINT uq_user_username UNIQUE (username),
  ADD CONSTRAINT chk_user_username CHECK (username REGEXP '^[A-Za-z0-9_]{3,20}$');

-- ---------------------------------------------------------------------
-- 2. Country codes (binary collation, so lower-case codes are rejected)
-- ---------------------------------------------------------------------
ALTER TABLE player
  ADD COLUMN country_code CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD CONSTRAINT chk_player_country_code
      CHECK (country_code IS NULL OR country_code REGEXP '^[A-Z]{2}$');

ALTER TABLE app_user
  ADD COLUMN country_code CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD CONSTRAINT chk_user_country_code
      CHECK (country_code IS NULL OR country_code REGEXP '^[A-Z]{2}$');

-- Backfill country_code from existing country names
UPDATE player SET country_code = CASE
  WHEN country = 'Norway' THEN 'NO'
  WHEN country IN ('USA', 'United States', 'US') THEN 'US'
  WHEN country = 'India' THEN 'IN'
  WHEN country = 'Uzbekistan' THEN 'UZ'
  WHEN country = 'France' THEN 'FR'
  WHEN country = 'China' THEN 'CN'
  WHEN country = 'Germany' THEN 'DE'
  WHEN country = 'Netherlands' THEN 'NL'
  WHEN country = 'Spain' THEN 'ES'
  WHEN country = 'Poland' THEN 'PL'
  WHEN country = 'Sweden' THEN 'SE'
  WHEN country = 'Armenia' THEN 'AM'
  WHEN country = 'Japan' THEN 'JP'
  WHEN country = 'Brazil' THEN 'BR'
  WHEN country = 'Cuba' THEN 'CU'
  WHEN country = 'Russia' THEN 'RU'
  WHEN country IN ('United Kingdom', 'England', 'UK') THEN 'GB'
  WHEN country = 'Canada' THEN 'CA'
  WHEN country = 'Italy' THEN 'IT'
  WHEN country = 'Azerbaijan' THEN 'AZ'
  WHEN country = 'Hungary' THEN 'HU'
  WHEN country = 'Ukraine' THEN 'UA'
  WHEN country = 'Romania' THEN 'RO'
  WHEN country = 'Vietnam' THEN 'VN'
  WHEN country = 'Iran' THEN 'IR'
  WHEN country = 'Argentina' THEN 'AR'
  WHEN country = 'Australia' THEN 'AU'
  WHEN country = 'Turkey' THEN 'TR'
  WHEN country = 'Georgia' THEN 'GE'
  WHEN country = 'Israel' THEN 'IL'
  WHEN country = 'Czech Republic' THEN 'CZ'
  ELSE NULL
END WHERE country_code IS NULL;

UPDATE app_user u
JOIN player p ON u.player_id = p.player_id
SET u.country_code = p.country_code
WHERE u.country_code IS NULL AND p.country_code IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Admin approval list now shows the username and country
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_pending_approvals;
CREATE VIEW v_pending_approvals AS
SELECT u.user_id, u.username, u.full_name, u.email, u.role, u.phone, u.organization,
       COALESCE(p.country_code, u.country_code) AS country_code,
       p.experience_level, p.club, p.fide_id, u.created_at
FROM app_user u
LEFT JOIN player p ON p.player_id = u.player_id
WHERE u.approval_status = 'PENDING'
  AND u.email_verified = 1
  AND u.status = 'ACTIVE'
  AND u.role IN ('ORGANIZER','PLAYER');
