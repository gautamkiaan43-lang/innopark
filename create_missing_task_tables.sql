-- =====================================================
-- Create Missing Task-Related Tables
-- Run this script to create the missing tables for task functionality
-- =====================================================

USE crm_db;

-- Tasks (Main Table)
-- This table stores task information
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
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_task_code` (`code`),
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_project` (`project_id`),
  INDEX `idx_task_company` (`company_id`),
  INDEX `idx_task_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task Assignees (Many-to-Many)
-- This table links tasks to multiple assigned users
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

-- Task Tags (Many-to-Many)
-- This table stores tags/labels for tasks
CREATE TABLE IF NOT EXISTS `task_tags` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `tag` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_tag_task` (`task_id`),
  INDEX `idx_task_tag_name` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_db' 
  AND TABLE_NAME IN ('tasks', 'task_assignees', 'task_tags')
ORDER BY TABLE_NAME;

