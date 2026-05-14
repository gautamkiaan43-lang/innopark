-- =====================================================
-- COMPLETE DATABASE SCHEMA FIX
-- CRM System - All 4 Dashboards
-- Generated: January 15, 2026
-- =====================================================
-- This file adds ALL missing columns identified during
-- the Frontend → Backend → Database audit
-- =====================================================

-- =====================================================
-- 1. PROJECTS TABLE - Add visibility column
-- =====================================================
-- Frontend: Projects.jsx uses 'visibility' field
-- Backend: projectController expects visibility
-- Database: Column was missing

ALTER TABLE `projects`
ADD COLUMN IF NOT EXISTS `visibility` VARCHAR(50) DEFAULT 'private'
AFTER `project_type`;

-- =====================================================
-- 2. TASKS TABLE - Add points column
-- =====================================================
-- Frontend: Tasks.jsx has 'points' field for story points
-- Backend: taskController expects points
-- Database: Column was missing

ALTER TABLE `tasks`
ADD COLUMN IF NOT EXISTS `points` INT(11) DEFAULT NULL
AFTER `priority`;

-- =====================================================
-- 3. TICKETS TABLE - Add ticket_type and update status
-- =====================================================
-- Frontend: Tickets.jsx uses 'ticket_type' field
-- Frontend expects status: Open, New, Pending, In Progress, Closed, Resolved
-- Database: ticket_type was missing, status enum was limited

ALTER TABLE `tickets`
ADD COLUMN IF NOT EXISTS `ticket_type` VARCHAR(100) DEFAULT NULL
AFTER `subject`;

-- Update status enum to include all frontend values
ALTER TABLE `tickets`
MODIFY COLUMN `status` ENUM('Open','New','Pending','In Progress','Closed','Resolved') DEFAULT 'Open';

-- Add file attachment column for tickets
ALTER TABLE `tickets`
ADD COLUMN IF NOT EXISTS `file_path` VARCHAR(500) DEFAULT NULL
AFTER `description`;

-- =====================================================
-- 4. SUBSCRIPTIONS TABLE - Add missing columns
-- =====================================================
-- Frontend: Subscriptions.jsx uses first_billing_date, cycles
-- Database: These columns were missing

ALTER TABLE `subscriptions`
ADD COLUMN IF NOT EXISTS `first_billing_date` DATE DEFAULT NULL
AFTER `next_billing_date`;

ALTER TABLE `subscriptions`
ADD COLUMN IF NOT EXISTS `completed_cycles` INT(11) DEFAULT 0
AFTER `first_billing_date`;

ALTER TABLE `subscriptions`
ADD COLUMN IF NOT EXISTS `total_cycles` INT(11) DEFAULT NULL
AFTER `completed_cycles`;

ALTER TABLE `subscriptions`
ADD COLUMN IF NOT EXISTS `title` VARCHAR(255) DEFAULT NULL
AFTER `plan`;

-- =====================================================
-- 5. ATTENDANCE TABLE - Add total_hours column
-- =====================================================
-- Frontend: Attendance.jsx displays total_hours
-- Backend: attendanceController calculates but doesn't store
-- Database: Column was missing

ALTER TABLE `attendance`
ADD COLUMN IF NOT EXISTS `total_hours` DECIMAL(5,2) DEFAULT NULL
AFTER `check_out`;

-- =====================================================
-- 6. CONTACTS TABLE - Add missing columns (already done but ensuring)
-- =====================================================
-- These columns were added in previous fix but ensuring they exist

ALTER TABLE `contacts`
ADD COLUMN IF NOT EXISTS `company` VARCHAR(255) DEFAULT NULL
AFTER `name`;

ALTER TABLE `contacts`
ADD COLUMN IF NOT EXISTS `contact_type` VARCHAR(50) DEFAULT 'Client'
AFTER `country`;

ALTER TABLE `contacts`
ADD COLUMN IF NOT EXISTS `assigned_user_id` INT(10) UNSIGNED DEFAULT NULL
AFTER `contact_type`;

ALTER TABLE `contacts`
ADD COLUMN IF NOT EXISTS `status` VARCHAR(50) DEFAULT 'Active'
AFTER `assigned_user_id`;

-- =====================================================
-- 7. PAYMENTS TABLE - Add payment_method for UI compatibility
-- =====================================================
-- Frontend expects 'payment_method' field
-- Database has payment_gateway and offline_payment_method

ALTER TABLE `payments`
ADD COLUMN IF NOT EXISTS `payment_method` VARCHAR(100) DEFAULT NULL
AFTER `offline_payment_method`;

-- =====================================================
-- 8. LEAD_LABEL_DEFINITIONS TABLE - Ensure exists
-- =====================================================
-- Frontend: Labels with colors
-- This table stores global label definitions with colors

CREATE TABLE IF NOT EXISTS `lead_label_definitions` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) DEFAULT '#22c55e',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_label_company` (`company_id`, `name`),
  KEY `idx_lead_label_defs_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. LEAD_STATUS_HISTORY TABLE - Ensure exists
-- =====================================================
-- Used for tracking lead status changes

CREATE TABLE IF NOT EXISTS `lead_status_history` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` INT(10) UNSIGNED NOT NULL,
  `lead_id` INT(10) UNSIGNED NOT NULL,
  `old_status` VARCHAR(50) DEFAULT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `changed_by` INT(10) UNSIGNED DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lead_status_history_lead` (`lead_id`),
  KEY `idx_lead_status_history_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. PROJECT_LABELS TABLE - Ensure correct structure
-- =====================================================

CREATE TABLE IF NOT EXISTS `project_labels` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` INT(10) UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) DEFAULT '#3B82F6',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_project_labels_company` (`company_id`),
  KEY `idx_project_labels_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. CLIENT_LABELS TABLE - Ensure correct structure
-- =====================================================

CREATE TABLE IF NOT EXISTS `client_labels` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` INT(10) UNSIGNED NOT NULL,
  `client_id` INT(10) UNSIGNED NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) DEFAULT '#3B82F6',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_labels_company` (`company_id`),
  KEY `idx_client_labels_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. TASK_FILES TABLE - Ensure exists for file attachments
-- =====================================================

CREATE TABLE IF NOT EXISTS `task_files` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT(10) UNSIGNED NOT NULL,
  `user_id` INT(10) UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` BIGINT DEFAULT 0,
  `file_type` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_task_files_task` (`task_id`),
  KEY `idx_task_files_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 13. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Projects visibility index
CREATE INDEX IF NOT EXISTS `idx_projects_visibility` ON `projects` (`visibility`);

-- Tasks points index
CREATE INDEX IF NOT EXISTS `idx_tasks_points` ON `tasks` (`points`);

-- Tickets type index
CREATE INDEX IF NOT EXISTS `idx_tickets_type` ON `tickets` (`ticket_type`);

-- Subscriptions cycles index
CREATE INDEX IF NOT EXISTS `idx_subscriptions_cycles` ON `subscriptions` (`completed_cycles`, `total_cycles`);

-- Attendance total_hours index
CREATE INDEX IF NOT EXISTS `idx_attendance_total_hours` ON `attendance` (`total_hours`);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS `idx_contacts_assigned_user` ON `contacts` (`assigned_user_id`);
CREATE INDEX IF NOT EXISTS `idx_contacts_contact_type` ON `contacts` (`contact_type`);
CREATE INDEX IF NOT EXISTS `idx_contacts_status` ON `contacts` (`status`);

-- =====================================================
-- 14. VERIFY CHANGES
-- =====================================================

-- Verify projects table
SELECT 'PROJECTS TABLE' as TableName;
SHOW COLUMNS FROM `projects` WHERE Field IN ('visibility');

-- Verify tasks table
SELECT 'TASKS TABLE' as TableName;
SHOW COLUMNS FROM `tasks` WHERE Field IN ('points');

-- Verify tickets table
SELECT 'TICKETS TABLE' as TableName;
SHOW COLUMNS FROM `tickets` WHERE Field IN ('ticket_type', 'status', 'file_path');

-- Verify subscriptions table
SELECT 'SUBSCRIPTIONS TABLE' as TableName;
SHOW COLUMNS FROM `subscriptions` WHERE Field IN ('first_billing_date', 'completed_cycles', 'total_cycles', 'title');

-- Verify attendance table
SELECT 'ATTENDANCE TABLE' as TableName;
SHOW COLUMNS FROM `attendance` WHERE Field IN ('total_hours');

-- Verify contacts table
SELECT 'CONTACTS TABLE' as TableName;
SHOW COLUMNS FROM `contacts` WHERE Field IN ('company', 'contact_type', 'assigned_user_id', 'status');

-- Verify payments table
SELECT 'PAYMENTS TABLE' as TableName;
SHOW COLUMNS FROM `payments` WHERE Field IN ('payment_method');

SELECT 'SCHEMA FIX COMPLETE!' as Status;
