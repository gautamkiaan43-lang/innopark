-- =====================================================
-- COMPLETE TASK SYSTEM DATABASE SETUP
-- Run this script to ensure all task-related tables and columns exist
-- =====================================================

USE crm_db;

-- 1. Ensure `tasks` table exists
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `sub_description` VARCHAR(500) NULL,
  `task_category` VARCHAR(100) NULL,
  `project_id` INT UNSIGNED NULL,
  `start_date` DATE NULL,
  `due_date` DATE NULL,
  `status` ENUM('Incomplete', 'Doing', 'Done') DEFAULT 'Incomplete',
  `priority` ENUM('High', 'Medium', 'Low') NULL,
  `estimated_time` VARCHAR(50) NULL,
  `description` TEXT NULL,
  `completed_on` DATETIME NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  INDEX `idx_task_code` (`code`),
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_project` (`project_id`),
  INDEX `idx_task_company` (`company_id`),
  INDEX `idx_task_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add ALL linking columns to `tasks` table (if missing)
-- This ensures tasks can be linked to Deals, Clients, Leads, and Contacts
ALTER TABLE `tasks` 
ADD COLUMN IF NOT EXISTS `client_id` INT(10) UNSIGNED DEFAULT NULL AFTER `project_id`,
ADD COLUMN IF NOT EXISTS `lead_id` INT(10) UNSIGNED DEFAULT NULL AFTER `client_id`,
ADD COLUMN IF NOT EXISTS `deal_id` INT(10) UNSIGNED DEFAULT NULL AFTER `lead_id`,
ADD COLUMN IF NOT EXISTS `contact_id` INT(10) UNSIGNED DEFAULT NULL AFTER `deal_id`,
ADD COLUMN IF NOT EXISTS `related_company_id` INT(10) UNSIGNED DEFAULT NULL AFTER `contact_id`,
ADD COLUMN IF NOT EXISTS `points` INT(11) DEFAULT NULL AFTER `priority`;

-- 3. Add Indexes for new columns
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_client` (`client_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_lead` (`lead_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_deal` (`deal_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_contact` (`contact_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_related_company` (`related_company_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_points` (`points`);

-- 4. Create `task_assignees` table (Assign users to tasks)
CREATE TABLE IF NOT EXISTS `task_assignees` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_task_assignee` (`task_id`, `user_id`),
  INDEX `idx_task_assignee_task` (`task_id`),
  INDEX `idx_task_assignee_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create `task_tags` table (Labels for tasks)
CREATE TABLE IF NOT EXISTS `task_tags` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `tag` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_tag_task` (`task_id`),
  INDEX `idx_task_tag_name` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create `task_comments` table (Discussion on tasks)
CREATE TABLE IF NOT EXISTS `task_comments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment` TEXT NOT NULL,
  `file_path` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_comment_task` (`task_id`),
  INDEX `idx_task_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create `task_files` table (File attachments for tasks)
CREATE TABLE IF NOT EXISTS `task_files` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` BIGINT NULL,
  `file_type` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_file_task` (`task_id`),
  INDEX `idx_task_file_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Verify Setup
SELECT 'Task System Tables Verified' as status;
