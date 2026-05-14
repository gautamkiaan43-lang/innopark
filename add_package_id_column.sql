-- =====================================================
-- Add package_id column to companies table
-- Run this file directly in your MySQL database
-- This script is idempotent - safe to run multiple times
-- =====================================================

USE crm_db;

-- Step 1: Add package_id column (if it doesn't exist)
-- Check if column exists first
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'crm_db' 
    AND TABLE_NAME = 'companies' 
    AND COLUMN_NAME = 'package_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `companies` ADD COLUMN `package_id` INT UNSIGNED NULL AFTER `timezone`',
    'SELECT "Column package_id already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add index for better query performance (if it doesn't exist)
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'crm_db' 
    AND TABLE_NAME = 'companies' 
    AND INDEX_NAME = 'idx_company_package'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `companies` ADD INDEX `idx_company_package` (`package_id`)',
    'SELECT "Index idx_company_package already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add foreign key constraint (optional - if it doesn't exist)
-- Uncomment the following block if you want to enforce referential integrity
/*
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'crm_db' 
    AND TABLE_NAME = 'companies' 
    AND CONSTRAINT_NAME = 'fk_company_package'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `companies` ADD CONSTRAINT `fk_company_package` FOREIGN KEY (`package_id`) REFERENCES `company_packages`(`id`) ON DELETE SET NULL',
    'SELECT "Foreign key fk_company_package already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
*/

-- =====================================================
-- Verification: Check if column was added successfully
-- Run this query separately to verify
-- =====================================================
-- DESCRIBE companies;
-- OR
-- SHOW COLUMNS FROM companies LIKE 'package_id';
-- OR
-- SHOW INDEXES FROM companies WHERE Key_name = 'idx_company_package';

