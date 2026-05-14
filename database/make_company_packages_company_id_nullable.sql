-- =====================================================
-- Migration: Make company_id nullable in company_packages
-- Description: Allows system-wide packages (superadmin packages) to have NULL company_id
-- =====================================================

-- Make company_id nullable
ALTER TABLE `company_packages` 
MODIFY COLUMN `company_id` INT UNSIGNED NULL;

-- Update foreign key constraint to handle NULL values
-- First, drop the existing foreign key if it exists
ALTER TABLE `company_packages` 
DROP FOREIGN KEY IF EXISTS `company_packages_ibfk_1`;

-- Re-add foreign key with proper NULL handling
ALTER TABLE `company_packages` 
ADD CONSTRAINT `fk_company_packages_company` 
FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) 
ON DELETE CASCADE;

-- =====================================================
-- Verification Query
-- =====================================================
-- SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND TABLE_NAME = 'company_packages'
-- AND COLUMN_NAME = 'company_id';

