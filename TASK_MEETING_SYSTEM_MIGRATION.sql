-- =====================================================
-- TASK & MEETING MANAGEMENT SYSTEM COMPLETE DATABASE SETUP
-- =====================================================

USE crm_db;

-- 1. Setup Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `due_date` DATE NOT NULL,
  `priority` ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  `status` ENUM('Pending', 'Completed', 'Overdue') DEFAULT 'Pending',
  `assigned_to` INT UNSIGNED NOT NULL,
  `reminder_datetime` DATETIME NULL,
  `related_to_type` ENUM('lead', 'deal', 'contact', 'company', 'other') NULL,
  `related_to_id` INT UNSIGNED NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_task_company` (`company_id`),
  INDEX `idx_task_assigned` (`assigned_to`),
  INDEX `idx_task_due_date` (`due_date`),
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_related` (`related_to_type`, `related_to_id`),
  INDEX `idx_task_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Setup Meetings Table
CREATE TABLE IF NOT EXISTS `meetings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `meeting_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `location` VARCHAR(255) NULL,
  `assigned_to` INT UNSIGNED NOT NULL,
  `reminder_datetime` DATETIME NULL,
  `related_to_type` ENUM('lead', 'deal', 'contact', 'company', 'other') NULL,
  `related_to_id` INT UNSIGNED NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_meeting_company` (`company_id`),
  INDEX `idx_meeting_assigned` (`assigned_to`),
  INDEX `idx_meeting_date` (`meeting_date`),
  INDEX `idx_meeting_related` (`related_to_type`, `related_to_id`),
  INDEX `idx_meeting_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Migration: if tables already exist but lack new columns, run these:
-- This is a safety measure if they have old structures.
-- Since the user asked for a "proper relational structure" we should ensure these columns exist.

-- Tasks updates (if exists)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'related_to_type') > 0,
    "SELECT 1",
    "ALTER TABLE tasks ADD COLUMN related_to_type ENUM('lead', 'deal', 'contact', 'company', 'other') NULL DEFAULT 'other'"
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'related_to_id') > 0,
    "SELECT 1",
    "ALTER TABLE tasks ADD COLUMN related_to_id INT UNSIGNED NULL"
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'reminder_datetime') > 0,
    "SELECT 1",
    "ALTER TABLE tasks ADD COLUMN reminder_datetime DATETIME NULL AFTER assigned_to"
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure status has 'Overdue'
ALTER TABLE `tasks` MODIFY COLUMN `status` ENUM('Pending', 'Completed', 'Overdue') DEFAULT 'Pending';

-- Verify Tables
SELECT 'Database Migration for Task & Meeting System Successful' as message;
