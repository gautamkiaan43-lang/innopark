-- =====================================================
-- Create Missing Lead-Related Tables
-- Run this script to create the missing tables for lead functionality
-- =====================================================

USE crm_db;

-- Lead Managers (Many-to-Many)
-- This table links leads to multiple managers/users
CREATE TABLE IF NOT EXISTS `lead_managers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_lead_manager` (`lead_id`, `user_id`),
  INDEX `idx_lead_mgr_lead` (`lead_id`),
  INDEX `idx_lead_mgr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lead Labels (Many-to-Many)
-- This table stores labels/tags for leads
CREATE TABLE IF NOT EXISTS `lead_labels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  INDEX `idx_lead_label_lead` (`lead_id`),
  INDEX `idx_lead_label_name` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client Contacts (if missing)
-- This table stores contact information for clients
CREATE TABLE IF NOT EXISTS `client_contacts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `job_title` VARCHAR(100) NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `is_primary` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_contact_client` (`client_id`),
  INDEX `idx_contact_email` (`email`),
  INDEX `idx_contact_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_db' 
  AND TABLE_NAME IN ('lead_managers', 'lead_labels', 'client_contacts')
ORDER BY TABLE_NAME;

