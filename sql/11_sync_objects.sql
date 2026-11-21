-- =====================================================================
-- sql/11_sync_objects.sql | Synced database objects
-- MySQL 8.0+.
-- Contains triggers and objects that were created in the database
-- but missing from source migration files.
-- =====================================================================

DROP TRIGGER IF EXISTS trg_app_user_bi_username;

DELIMITER $$

CREATE TRIGGER trg_app_user_bi_username
BEFORE INSERT ON app_user
FOR EACH ROW
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    SET NEW.username = LEFT(CONCAT(
      COALESCE(NULLIF(LEFT(REGEXP_REPLACE(SUBSTRING_INDEX(NEW.email, '@', 1), '[^A-Za-z0-9_]', ''), 10), ''), 'user'),
      '_',
      FLOOR(100000 + (RAND() * 899999))
    ), 20);
  END IF;
END$$

DELIMITER ;
