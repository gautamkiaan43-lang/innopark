-- =====================================================
-- Fix company_packages Table
-- Description: Creates company_packages table if it doesn't exist
-- Run this if you're getting "Failed to fetch packages" error
-- =====================================================

-- Check if table exists, if not create it
CREATE TABLE IF NOT EXISTS `company_packages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NULL, -- NULL for system-wide packages (superadmin packages)
  `package_name` VARCHAR(255) NOT NULL,
  `features` JSON NULL,
  `price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `billing_cycle` ENUM('Monthly', 'Quarterly', 'Yearly') DEFAULT 'Monthly',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  INDEX `idx_package_company` (`company_id`),
  INDEX `idx_package_deleted` (`is_deleted`),
  INDEX `idx_package_name` (`package_name`),
  INDEX `idx_package_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Make company_id nullable if it's not already (for superadmin packages)
ALTER TABLE `company_packages` 
MODIFY COLUMN `company_id` INT UNSIGNED NULL;

-- Add foreign key constraint if it doesn't exist (only for non-null company_id)
-- Note: MySQL doesn't support conditional foreign keys, so we'll handle NULL in application

-- Insert default packages if table is empty
INSERT INTO `company_packages` (`company_id`, `package_name`, `features`, `price`, `billing_cycle`, `status`)
SELECT NULL, 'Basic', '["Users", "Projects", "Tasks"]', 0.00, 'Monthly', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM `company_packages` WHERE `package_name` = 'Basic' AND `company_id` IS NULL);

INSERT INTO `company_packages` (`company_id`, `package_name`, `features`, `price`, `billing_cycle`, `status`)
SELECT NULL, 'Pro', '["Users", "Projects", "Tasks", "Invoices", "Reports"]', 99.00, 'Monthly', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM `company_packages` WHERE `package_name` = 'Pro' AND `company_id` IS NULL);

INSERT INTO `company_packages` (`company_id`, `package_name`, `features`, `price`, `billing_cycle`, `status`)
SELECT NULL, 'Enterprise', '["All Features", "Priority Support", "Custom Integrations"]', 299.00, 'Monthly', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM `company_packages` WHERE `package_name` = 'Enterprise' AND `company_id` IS NULL);

-- Verify table was created
SELECT 'company_packages table created/verified successfully!' AS status;
SELECT COUNT(*) as total_packages FROM `company_packages` WHERE `is_deleted` = 0;

