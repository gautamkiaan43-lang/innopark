-- Add show_in_client_portal and image_path columns to items table if they don't exist

-- Check if column show_in_client_portal exists, if not add it
SET @dbname = DATABASE();
SET @tablename = "items";
SET @columnname = "show_in_client_portal";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE items ADD COLUMN show_in_client_portal TINYINT(1) DEFAULT 0 COMMENT '0: No, 1: Yes' AFTER rate;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if column image_path exists, if not add it
SET @columnname = "image_path";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE items ADD COLUMN image_path VARCHAR(255) DEFAULT NULL COMMENT 'Path to item image' AFTER show_in_client_portal;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Simple version (if you just want to run directly and handle errors manually):
-- ALTER TABLE `items` ADD COLUMN `show_in_client_portal` TINYINT(1) DEFAULT 0 COMMENT '0: No, 1: Yes';
-- ALTER TABLE `items` ADD COLUMN `image_path` VARCHAR(255) DEFAULT NULL COMMENT 'Path to item image';
