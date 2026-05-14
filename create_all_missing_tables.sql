-- =====================================================
-- Create All Missing Tables
-- Run this script to create all missing tables for the CRM application
-- This combines lead-related and task-related tables
-- =====================================================

USE crm_db;

-- =====================================================
-- LEAD-RELATED TABLES
-- =====================================================

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

-- =====================================================
-- TASK-RELATED TABLES
-- =====================================================

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

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables were created
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_db' 
  AND TABLE_NAME IN (
    'lead_managers', 
    'lead_labels', 
    'client_contacts',
    'tasks',
    'task_assignees',
    'task_tags'
  )
ORDER BY TABLE_NAME;

-- Summary
SELECT 
    COUNT(*) as total_tables_created,
    GROUP_CONCAT(TABLE_NAME ORDER BY TABLE_NAME SEPARATOR ', ') as created_tables
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_db' 
  AND TABLE_NAME IN (
    'lead_managers', 
    'lead_labels', 
    'client_contacts',
    'tasks',
    'task_assignees',
    'task_tags'
  );

