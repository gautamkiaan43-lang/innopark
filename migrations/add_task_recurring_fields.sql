-- Migration to add recurring task fields
-- This migration adds repeat_every, repeat_unit, and cycles columns to tasks table

-- Check and add repeat_every column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = "tasks";
SET @columnname = "repeat_every";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'repeat_every column already exists'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN repeat_every INT NULL AFTER is_recurring")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add repeat_unit column if it doesn't exist
SET @columnname = "repeat_unit";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'repeat_unit column already exists'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN repeat_unit VARCHAR(20) NULL AFTER repeat_every")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add cycles column if it doesn't exist
SET @columnname = "cycles";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'cycles column already exists'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN cycles INT NULL AFTER repeat_unit")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

