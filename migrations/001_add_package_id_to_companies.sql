-- =====================================================
-- Migration: Add package_id column to companies table
-- Date: 2024
-- Description: Adds package_id column to link companies with company_packages
-- =====================================================

-- Add package_id column to companies table
ALTER TABLE `companies` 
ADD COLUMN `package_id` INT UNSIGNED NULL AFTER `timezone`;

-- Add index for better query performance
ALTER TABLE `companies` 
ADD INDEX `idx_company_package` (`package_id`);

-- Add foreign key constraint (optional - only if company_packages table exists)
-- Uncomment the following line if you want to enforce referential integrity
-- ALTER TABLE `companies` 
-- ADD CONSTRAINT `fk_company_package` 
-- FOREIGN KEY (`package_id`) REFERENCES `company_packages`(`id`) 
-- ON DELETE SET NULL;

-- =====================================================
-- Verification Query (run this to verify the column was added)
-- =====================================================
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND TABLE_NAME = 'companies'
-- AND COLUMN_NAME = 'package_id';

