-- Idempotent: adds leave_requests.user_id only if the column is missing.
-- Run once on MySQL (e.g. Railway MySQL client / mysql CLI) if you prefer a DB migration over app startup.

SET @db = DATABASE();
SET @preparedStatement = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'leave_requests' AND COLUMN_NAME = 'user_id') > 0,
    'SELECT 1 AS user_id_column_already_exists',
    'ALTER TABLE leave_requests ADD COLUMN user_id INT NULL AFTER company_id'
  )
);
PREPARE _stmt FROM @preparedStatement;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
