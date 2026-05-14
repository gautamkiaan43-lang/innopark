-- =====================================================
-- Complete SQL Script: Add package_id to companies table
-- Run this entire file in phpMyAdmin - SAFE to run multiple times!
-- =====================================================

USE crm_db;

-- Step 1: Add package_id column (only if it doesn't exist)
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'crm_db' 
    AND TABLE_NAME = 'companies' 
    AND COLUMN_NAME = 'package_id'
);

SET @sql_col = IF(@col_exists = 0,
    'ALTER TABLE `companies` ADD COLUMN `package_id` INT UNSIGNED NULL AFTER `timezone`',
    'SELECT "Column package_id already exists - skipped" AS result'
);
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add index (only if it doesn't exist)
SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'crm_db' 
    AND TABLE_NAME = 'companies' 
    AND INDEX_NAME = 'idx_company_package'
);

SET @sql_idx = IF(@idx_exists = 0,
    'ALTER TABLE `companies` ADD INDEX `idx_company_package` (`package_id`)',
    'SELECT "Index idx_company_package already exists - skipped" AS result'
);
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add foreign key constraint (optional - uncomment if needed)
-- SET @fk_exists = (
--     SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
--     WHERE TABLE_SCHEMA = 'crm_db' 
--     AND TABLE_NAME = 'companies' 
--     AND CONSTRAINT_NAME = 'fk_company_package'
-- );
-- 
-- SET @sql_fk = IF(@fk_exists = 0,
--     'ALTER TABLE `companies` ADD CONSTRAINT `fk_company_package` FOREIGN KEY (`package_id`) REFERENCES `company_packages`(`id`) ON DELETE SET NULL',
--     'SELECT "Foreign key fk_company_package already exists - skipped" AS result'
-- );
-- PREPARE stmt FROM @sql_fk;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- Success message
SELECT 'Script completed successfully! package_id column and index are ready.' AS status;

