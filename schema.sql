-- =====================================================
-- Worksuite CRM Database Schema
-- Generated: 2025-12-21
-- Based on: Frontend UI Analysis
-- =====================================================

-- Use the correct database
USE crm_db_innopark;

-- Drop existing tables (for fresh install)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `time_logs`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `expense_items`;
DROP TABLE IF EXISTS `estimates`;
DROP TABLE IF EXISTS `estimate_items`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `invoice_items`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `client_contacts`;
DROP TABLE IF EXISTS `leads`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `positions`;
DROP TABLE IF EXISTS `custom_fields`;
DROP TABLE IF EXISTS `email_templates`;
DROP TABLE IF EXISTS `finance_templates`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `social_leads`;
DROP TABLE IF EXISTS `company_packages`;
DROP TABLE IF EXISTS `companies`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 1. AUTHENTICATION & ORGANIZATION
-- =====================================================

-- Companies (Multi-tenancy)
-- Note: package_id FK will be added after company_packages table is created
CREATE TABLE `companies` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `logo` VARCHAR(500) NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `timezone` VARCHAR(50) DEFAULT 'UTC',
  `package_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  INDEX `idx_company_name` (`name`),
  INDEX `idx_company_deleted` (`is_deleted`),
  INDEX `idx_company_package` (`package_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT') NOT NULL DEFAULT 'EMPLOYEE',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `avatar` VARCHAR(500) NULL,
  `phone` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_email` (`email`),
  INDEX `idx_user_role` (`role`),
  INDEX `idx_user_company` (`company_id`),
  INDEX `idx_user_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles
CREATE TABLE `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_company` (`company_id`),
  INDEX `idx_role_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions
CREATE TABLE `permissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `module` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_permission_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Permissions (Many-to-Many)
CREATE TABLE `role_permissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_role_permission` (`role_id`, `permission_id`),
  INDEX `idx_role_perm_role` (`role_id`),
  INDEX `idx_role_perm_permission` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. CRM MODULE
-- =====================================================

-- Leads
CREATE TABLE `leads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `lead_type` ENUM('Organization', 'Person') NOT NULL DEFAULT 'Organization',
  `company_name` VARCHAR(255) NULL,
  `person_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `owner_id` INT UNSIGNED NOT NULL,
  `status` ENUM('New', 'Qualified', 'Discussion', 'Negotiation', 'Won', 'Lost') DEFAULT 'New',
  `source` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `zip` VARCHAR(20) NULL,
  `country` VARCHAR(100) NULL,
  `value` DECIMAL(15, 2) NULL,
  `due_followup` DATE NULL,
  `notes` TEXT NULL,
  `probability` INT NULL CHECK (`probability` >= 0 AND `probability` <= 100),
  `call_this_week` TINYINT(1) DEFAULT 0,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_lead_email` (`email`),
  INDEX `idx_lead_status` (`status`),
  INDEX `idx_lead_owner` (`owner_id`),
  INDEX `idx_lead_company` (`company_id`),
  INDEX `idx_lead_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lead Managers (Many-to-Many)
CREATE TABLE `lead_managers` (
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
CREATE TABLE `lead_labels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  INDEX `idx_lead_label_lead` (`lead_id`),
  INDEX `idx_lead_label_name` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients
CREATE TABLE `clients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `owner_id` INT UNSIGNED NOT NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `zip` VARCHAR(20) NULL,
  `country` VARCHAR(100) DEFAULT 'United States',
  `phone_country_code` VARCHAR(10) DEFAULT '+1',
  `phone_number` VARCHAR(50) NULL,
  `website` VARCHAR(500) NULL,
  `vat_number` VARCHAR(100) NULL,
  `gst_number` VARCHAR(100) NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `currency_symbol` VARCHAR(10) DEFAULT '$',
  `disable_online_payment` TINYINT(1) DEFAULT 0,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_client_name` (`company_name`),
  INDEX `idx_client_status` (`status`),
  INDEX `idx_client_owner` (`owner_id`),
  INDEX `idx_client_company` (`company_id`),
  INDEX `idx_client_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client Managers (Many-to-Many)
CREATE TABLE `client_managers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_client_manager` (`client_id`, `user_id`),
  INDEX `idx_client_mgr_client` (`client_id`),
  INDEX `idx_client_mgr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client Contacts
CREATE TABLE `client_contacts` (
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

-- Client Groups (Many-to-Many)
CREATE TABLE `client_groups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT UNSIGNED NOT NULL,
  `group_name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_client_group_client` (`client_id`),
  INDEX `idx_client_group_name` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client Labels (Many-to-Many)
CREATE TABLE `client_labels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT UNSIGNED NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_client_label_client` (`client_id`),
  INDEX `idx_client_label_name` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. WORK MODULE
-- =====================================================

-- Projects
CREATE TABLE `projects` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `short_code` VARCHAR(20) NOT NULL,
  `project_name` VARCHAR(255) NOT NULL,
  `start_date` DATE NOT NULL,
  `deadline` DATE NULL,
  `no_deadline` TINYINT(1) DEFAULT 0,
  `project_category` VARCHAR(100) NULL,
  `project_sub_category` VARCHAR(100) NULL,
  `department_id` INT UNSIGNED NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `project_summary` TEXT NULL,
  `notes` TEXT NULL,
  `public_gantt_chart` ENUM('enable', 'disable') DEFAULT 'enable',
  `public_task_board` ENUM('enable', 'disable') DEFAULT 'enable',
  `task_approval` ENUM('enable', 'disable') DEFAULT 'disable',
  `label` VARCHAR(100) NULL,
  `create_public_project` TINYINT(1) DEFAULT 0,
  `status` ENUM('in progress', 'completed', 'on hold', 'cancelled') DEFAULT 'in progress',
  `progress` INT DEFAULT 0 CHECK (`progress` >= 0 AND `progress` <= 100),
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_project_code` (`short_code`),
  INDEX `idx_project_status` (`status`),
  INDEX `idx_project_client` (`client_id`),
  INDEX `idx_project_company` (`company_id`),
  INDEX `idx_project_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project Members (Many-to-Many)
CREATE TABLE `project_members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_project_member` (`project_id`, `user_id`),
  INDEX `idx_project_member_project` (`project_id`),
  INDEX `idx_project_member_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks
CREATE TABLE `tasks` (
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
CREATE TABLE `task_assignees` (
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
CREATE TABLE `task_tags` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `tag` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_tag_task` (`task_id`),
  INDEX `idx_task_tag_name` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contracts
CREATE TABLE `contracts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `contract_number` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `contract_date` DATE NOT NULL,
  `valid_until` DATE NOT NULL,
  `client_id` INT UNSIGNED NULL,
  `lead_id` INT UNSIGNED NULL,
  `project_id` INT UNSIGNED NULL,
  `tax` VARCHAR(50) NULL,
  `second_tax` VARCHAR(50) NULL,
  `note` TEXT NULL,
  `file_path` VARCHAR(500) NULL,
  `amount` DECIMAL(15, 2) DEFAULT 0.00,
  `status` ENUM('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired') DEFAULT 'Draft',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_contract_number` (`contract_number`),
  INDEX `idx_contract_status` (`status`),
  INDEX `idx_contract_client` (`client_id`),
  INDEX `idx_contract_company` (`company_id`),
  INDEX `idx_contract_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions
CREATE TABLE `subscriptions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `plan` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `billing_cycle` ENUM('Monthly', 'Quarterly', 'Yearly') DEFAULT 'Monthly',
  `status` ENUM('Active', 'Cancelled', 'Suspended') DEFAULT 'Active',
  `next_billing_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_subscription_client` (`client_id`),
  INDEX `idx_subscription_status` (`status`),
  INDEX `idx_subscription_company` (`company_id`),
  INDEX `idx_subscription_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. FINANCE MODULE
-- =====================================================

-- Invoices
CREATE TABLE `invoices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `exchange_rate` DECIMAL(10, 4) DEFAULT 1.0000,
  `client_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NULL,
  `calculate_tax` ENUM('After Discount', 'Before Discount') DEFAULT 'After Discount',
  `bank_account` VARCHAR(255) NULL,
  `payment_details` TEXT NULL,
  `billing_address` TEXT NULL,
  `shipping_address` TEXT NULL,
  `generated_by` VARCHAR(100) DEFAULT 'Worksuite',
  `note` TEXT NULL,
  `terms` TEXT DEFAULT 'Thank you for your business.',
  `discount` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_type` ENUM('%', 'fixed') DEFAULT '%',
  `sub_total` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `total` DECIMAL(15, 2) DEFAULT 0.00,
  `paid` DECIMAL(15, 2) DEFAULT 0.00,
  `unpaid` DECIMAL(15, 2) DEFAULT 0.00,
  `status` ENUM('Paid', 'Unpaid', 'Partially Paid', 'Overdue', 'Cancelled') DEFAULT 'Unpaid',
  `is_recurring` TINYINT(1) DEFAULT 0,
  `billing_frequency` ENUM('Monthly', 'Quarterly', 'Yearly') NULL,
  `recurring_start_date` DATE NULL,
  `recurring_total_count` INT NULL,
  `is_time_log_invoice` TINYINT(1) DEFAULT 0,
  `time_log_from` DATE NULL,
  `time_log_to` DATE NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_invoice_number` (`invoice_number`),
  INDEX `idx_invoice_status` (`status`),
  INDEX `idx_invoice_client` (`client_id`),
  INDEX `idx_invoice_date` (`invoice_date`),
  INDEX `idx_invoice_company` (`company_id`),
  INDEX `idx_invoice_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Items
CREATE TABLE `invoice_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `quantity` DECIMAL(10, 2) DEFAULT 1.00,
  `unit` ENUM('Pcs', 'Kg', 'Hours', 'Days') DEFAULT 'Pcs',
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `tax` VARCHAR(50) NULL,
  `tax_rate` DECIMAL(5, 2) DEFAULT 0.00,
  `file_path` VARCHAR(500) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  INDEX `idx_invoice_item_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estimates
CREATE TABLE `estimates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `estimate_number` VARCHAR(50) NOT NULL UNIQUE,
  `valid_till` DATE NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `client_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NULL,
  `calculate_tax` ENUM('After Discount', 'Before Discount') DEFAULT 'After Discount',
  `description` TEXT NULL,
  `note` TEXT NULL,
  `terms` TEXT DEFAULT 'Thank you for your business.',
  `discount` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_type` ENUM('%', 'fixed') DEFAULT '%',
  `sub_total` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `total` DECIMAL(15, 2) DEFAULT 0.00,
  `estimate_request_number` VARCHAR(50) NULL,
  `status` ENUM('Waiting', 'Accepted', 'Declined', 'Expired', 'Draft') DEFAULT 'Waiting',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_estimate_number` (`estimate_number`),
  INDEX `idx_estimate_status` (`status`),
  INDEX `idx_estimate_client` (`client_id`),
  INDEX `idx_estimate_company` (`company_id`),
  INDEX `idx_estimate_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estimate Items
CREATE TABLE `estimate_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `estimate_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `quantity` DECIMAL(10, 2) DEFAULT 1.00,
  `unit` ENUM('Pcs', 'Kg', 'Hours', 'Days') DEFAULT 'Pcs',
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `tax` VARCHAR(50) NULL,
  `tax_rate` DECIMAL(5, 2) DEFAULT 0.00,
  `file_path` VARCHAR(500) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON DELETE CASCADE,
  INDEX `idx_estimate_item_estimate` (`estimate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NULL,
  `invoice_id` INT UNSIGNED NOT NULL,
  `paid_on` DATE NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `exchange_rate` DECIMAL(10, 4) DEFAULT 1.0000,
  `transaction_id` VARCHAR(255) NULL,
  `payment_gateway` VARCHAR(100) NULL,
  `offline_payment_method` ENUM('Cash', 'Cheque', 'Bank Transfer') NULL,
  `bank_account` VARCHAR(255) NULL,
  `receipt_path` VARCHAR(500) NULL,
  `remark` TEXT NULL,
  `status` ENUM('Complete', 'Pending', 'Failed') DEFAULT 'Complete',
  `order_number` VARCHAR(100) NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_payment_invoice` (`invoice_id`),
  INDEX `idx_payment_status` (`status`),
  INDEX `idx_payment_date` (`paid_on`),
  INDEX `idx_payment_company` (`company_id`),
  INDEX `idx_payment_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses
CREATE TABLE `expenses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `expense_number` VARCHAR(50) NOT NULL UNIQUE,
  `lead_id` INT UNSIGNED NULL,
  `deal_id` INT UNSIGNED NULL,
  `valid_till` DATE NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `calculate_tax` ENUM('After Discount', 'Before Discount') DEFAULT 'After Discount',
  `description` TEXT NULL,
  `note` TEXT NULL,
  `terms` TEXT DEFAULT 'Thank you for your business.',
  `discount` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_type` ENUM('%', 'fixed') DEFAULT '%',
  `sub_total` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `total` DECIMAL(15, 2) DEFAULT 0.00,
  `require_approval` TINYINT(1) DEFAULT 1,
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Paid') DEFAULT 'Pending',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_expense_number` (`expense_number`),
  INDEX `idx_expense_status` (`status`),
  INDEX `idx_expense_company` (`company_id`),
  INDEX `idx_expense_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expense Items
CREATE TABLE `expense_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `expense_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `quantity` DECIMAL(10, 2) DEFAULT 1.00,
  `unit` ENUM('Pcs', 'Kg', 'Hours', 'Days') DEFAULT 'Pcs',
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `tax` VARCHAR(50) NULL,
  `tax_rate` DECIMAL(5, 2) DEFAULT 0.00,
  `file_path` VARCHAR(500) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE CASCADE,
  INDEX `idx_expense_item_expense` (`expense_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Notes
CREATE TABLE `credit_notes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `credit_note_number` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `date` DATE NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('Pending', 'Approved', 'Applied') DEFAULT 'Pending',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_credit_note_number` (`credit_note_number`),
  INDEX `idx_credit_note_invoice` (`invoice_id`),
  INDEX `idx_credit_note_company` (`company_id`),
  INDEX `idx_credit_note_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. TEAM & OPERATIONS MODULE
-- =====================================================

-- Departments
CREATE TABLE `departments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `head_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`head_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_dept_name` (`name`),
  INDEX `idx_dept_company` (`company_id`),
  INDEX `idx_dept_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Positions
CREATE TABLE `positions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `department_id` INT UNSIGNED NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  INDEX `idx_position_name` (`name`),
  INDEX `idx_position_dept` (`department_id`),
  INDEX `idx_position_company` (`company_id`),
  INDEX `idx_position_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employees (Extended User Info)
CREATE TABLE `employees` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `employee_number` VARCHAR(50) NULL,
  `department_id` INT UNSIGNED NULL,
  `position_id` INT UNSIGNED NULL,
  `role` VARCHAR(100) NULL,
  `joining_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL,
  INDEX `idx_employee_user` (`user_id`),
  INDEX `idx_employee_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance
CREATE TABLE `attendance` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `check_in` TIME NULL,
  `check_out` TIME NULL,
  `status` ENUM('Present', 'Absent', 'Late', 'Half Day') DEFAULT 'Absent',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_attendance` (`user_id`, `date`),
  INDEX `idx_attendance_user` (`user_id`),
  INDEX `idx_attendance_date` (`date`),
  INDEX `idx_attendance_status` (`status`),
  INDEX `idx_attendance_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time Logs
CREATE TABLE `time_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NULL,
  `task_id` INT UNSIGNED NULL,
  `hours` DECIMAL(5, 2) NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
  INDEX `idx_time_log_user` (`user_id`),
  INDEX `idx_time_log_project` (`project_id`),
  INDEX `idx_time_log_task` (`task_id`),
  INDEX `idx_time_log_date` (`date`),
  INDEX `idx_time_log_company` (`company_id`),
  INDEX `idx_time_log_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events
CREATE TABLE `events` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `event_name` VARCHAR(255) NOT NULL,
  `label_color` VARCHAR(7) DEFAULT '#FF0000',
  `where` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `starts_on_date` DATE NOT NULL,
  `starts_on_time` TIME NOT NULL,
  `ends_on_date` DATE NOT NULL,
  `ends_on_time` TIME NOT NULL,
  `host_id` INT UNSIGNED NULL,
  `status` ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') NULL,
  `event_link` VARCHAR(500) NULL,
  `file_path` VARCHAR(500) NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`host_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_event_date` (`starts_on_date`),
  INDEX `idx_event_status` (`status`),
  INDEX `idx_event_company` (`company_id`),
  INDEX `idx_event_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Departments (Many-to-Many)
CREATE TABLE `event_departments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT UNSIGNED NOT NULL,
  `department_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_event_dept` (`event_id`, `department_id`),
  INDEX `idx_event_dept_event` (`event_id`),
  INDEX `idx_event_dept_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Employees (Many-to-Many)
CREATE TABLE `event_employees` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_event_employee` (`event_id`, `user_id`),
  INDEX `idx_event_emp_event` (`event_id`),
  INDEX `idx_event_emp_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Clients (Many-to-Many)
CREATE TABLE `event_clients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT UNSIGNED NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_event_client` (`event_id`, `client_id`),
  INDEX `idx_event_client_event` (`event_id`),
  INDEX `idx_event_client_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leave Requests
CREATE TABLE `leave_requests` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `leave_type` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  `applied_on` DATE NOT NULL,
  `approved_by` INT UNSIGNED NULL,
  `approved_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_leave_user` (`user_id`),
  INDEX `idx_leave_status` (`status`),
  INDEX `idx_leave_date` (`start_date`),
  INDEX `idx_leave_company` (`company_id`),
  INDEX `idx_leave_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. COMMUNICATION MODULE
-- =====================================================

-- Messages
CREATE TABLE `messages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `from_user_id` INT UNSIGNED NOT NULL,
  `to_user_id` INT UNSIGNED NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `file_path` VARCHAR(500) NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_message_from` (`from_user_id`),
  INDEX `idx_message_to` (`to_user_id`),
  INDEX `idx_message_read` (`is_read`),
  INDEX `idx_message_company` (`company_id`),
  INDEX `idx_message_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message Recipients (Many-to-Many for group messages)
CREATE TABLE `message_recipients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_msg_recipient_msg` (`message_id`),
  INDEX `idx_msg_recipient_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tickets
CREATE TABLE `tickets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `ticket_id` VARCHAR(50) NOT NULL UNIQUE,
  `subject` VARCHAR(255) NOT NULL,
  `client_id` INT UNSIGNED NOT NULL,
  `priority` ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  `description` TEXT NULL,
  `status` ENUM('Open', 'Pending', 'Closed') DEFAULT 'Open',
  `assigned_to_id` INT UNSIGNED NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_ticket_id` (`ticket_id`),
  INDEX `idx_ticket_status` (`status`),
  INDEX `idx_ticket_client` (`client_id`),
  INDEX `idx_ticket_priority` (`priority`),
  INDEX `idx_ticket_company` (`company_id`),
  INDEX `idx_ticket_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket Comments
CREATE TABLE `ticket_comments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment` TEXT NOT NULL,
  `file_path` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_ticket_comment_ticket` (`ticket_id`),
  INDEX `idx_ticket_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(500) NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notification_user` (`user_id`),
  INDEX `idx_notification_read` (`is_read`),
  INDEX `idx_notification_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. TOOLS & UTILITIES MODULE
-- =====================================================

-- Custom Fields
CREATE TABLE `custom_fields` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `type` ENUM('text', 'textarea', 'number', 'email', 'phone', 'date', 'datetime', 'dropdown', 'multiselect', 'checkbox', 'radio', 'file', 'url') NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `required` TINYINT(1) DEFAULT 0,
  `default_value` VARCHAR(500) NULL,
  `placeholder` VARCHAR(255) NULL,
  `help_text` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_custom_field_module` (`module`),
  INDEX `idx_custom_field_company` (`company_id`),
  INDEX `idx_custom_field_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custom Field Options (for dropdown/radio/checkbox/multiselect)
CREATE TABLE `custom_field_options` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `custom_field_id` INT UNSIGNED NOT NULL,
  `option_value` VARCHAR(255) NOT NULL,
  `display_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`custom_field_id`) REFERENCES `custom_fields`(`id`) ON DELETE CASCADE,
  INDEX `idx_custom_field_option_field` (`custom_field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custom Field Visibility
CREATE TABLE `custom_field_visibility` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `custom_field_id` INT UNSIGNED NOT NULL,
  `visibility` ENUM('admin', 'employee', 'client', 'all') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`custom_field_id`) REFERENCES `custom_fields`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_field_visibility` (`custom_field_id`, `visibility`),
  INDEX `idx_custom_field_vis_field` (`custom_field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custom Field Enabled In
CREATE TABLE `custom_field_enabled_in` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `custom_field_id` INT UNSIGNED NOT NULL,
  `enabled_in` ENUM('create', 'edit', 'table', 'filters', 'reports') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`custom_field_id`) REFERENCES `custom_fields`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_field_enabled` (`custom_field_id`, `enabled_in`),
  INDEX `idx_custom_field_enabled_field` (`custom_field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custom Field Values
CREATE TABLE `custom_field_values` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `custom_field_id` INT UNSIGNED NOT NULL,
  `record_id` INT UNSIGNED NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `field_value` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`custom_field_id`) REFERENCES `custom_fields`(`id`) ON DELETE CASCADE,
  INDEX `idx_cfv_record` (`record_id`, `module`),
  INDEX `idx_cfv_field` (`custom_field_id`),
  INDEX `idx_cfv_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Templates
CREATE TABLE `email_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `body` TEXT NOT NULL,
  `type` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_email_template_company` (`company_id`),
  INDEX `idx_email_template_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Finance Templates
CREATE TABLE `finance_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('invoice', 'estimate', 'expense') NOT NULL,
  `template_data` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_finance_template_company` (`company_id`),
  INDEX `idx_finance_template_type` (`type`),
  INDEX `idx_finance_template_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documents
CREATE TABLE `documents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` BIGINT NULL,
  `file_type` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_document_user` (`user_id`),
  INDEX `idx_document_category` (`category`),
  INDEX `idx_document_company` (`company_id`),
  INDEX `idx_document_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Social Media Leads
CREATE TABLE `social_leads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `platform` VARCHAR(50) NOT NULL,
  `lead_data` JSON NOT NULL,
  `status` VARCHAR(50) DEFAULT 'New',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_social_lead_platform` (`platform`),
  INDEX `idx_social_lead_company` (`company_id`),
  INDEX `idx_social_lead_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. SYSTEM MODULE
-- =====================================================

-- Company Packages
CREATE TABLE `company_packages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NULL,
  `package_name` VARCHAR(255) NOT NULL,
  `features` JSON NULL,
  `price` DECIMAL(15, 2) NOT NULL,
  `billing_cycle` ENUM('Monthly', 'Quarterly', 'Yearly') DEFAULT 'Monthly',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  INDEX `idx_package_company` (`company_id`),
  INDEX `idx_package_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Settings
CREATE TABLE `system_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `setting_type` VARCHAR(50) DEFAULT 'string',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_setting` (`company_id`, `setting_key`),
  INDEX `idx_setting_key` (`setting_key`),
  INDEX `idx_setting_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs
CREATE TABLE `audit_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `record_id` INT UNSIGNED NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_date` (`created_at`),
  INDEX `idx_audit_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default company
INSERT INTO `companies` (`name`, `currency`, `timezone`) VALUES ('Default Company', 'USD', 'UTC');

-- =====================================================
-- DEFAULT USERS - ONE USER PER ROLE
-- =====================================================
-- User ID 1: ADMIN - Super Admin
-- Email: admin@crmapp.com
-- Password: Admin@123
-- =====================================================
INSERT INTO `users` (`company_id`, `name`, `email`, `password`, `role`, `status`) VALUES 
(1, 'Super Admin', 'admin@crmapp.com', '$2a$10$GfWvRNlTDerXb5Ux4p/BPuiCI8uVAb/X1vSqg1CNKl7/MhOYvL4y.', 'ADMIN', 'Active');

-- Insert default permissions
INSERT INTO `permissions` (`name`, `module`, `description`) VALUES
('leads.view', 'Leads', 'View leads'),
('leads.create', 'Leads', 'Create leads'),
('leads.edit', 'Leads', 'Edit leads'),
('leads.delete', 'Leads', 'Delete leads'),
('clients.view', 'Clients', 'View clients'),
('clients.create', 'Clients', 'Create clients'),
('clients.edit', 'Clients', 'Edit clients'),
('clients.delete', 'Clients', 'Delete clients'),
('projects.view', 'Projects', 'View projects'),
('projects.create', 'Projects', 'Create projects'),
('projects.edit', 'Projects', 'Edit projects'),
('projects.delete', 'Projects', 'Delete projects'),
('tasks.view', 'Tasks', 'View tasks'),
('tasks.create', 'Tasks', 'Create tasks'),
('tasks.edit', 'Tasks', 'Edit tasks'),
('tasks.delete', 'Tasks', 'Delete tasks'),
('invoices.view', 'Invoices', 'View invoices'),
('invoices.create', 'Invoices', 'Create invoices'),
('invoices.edit', 'Invoices', 'Edit invoices'),
('invoices.delete', 'Invoices', 'Delete invoices'),
('estimates.view', 'Estimates', 'View estimates'),
('estimates.create', 'Estimates', 'Create estimates'),
('estimates.edit', 'Estimates', 'Edit estimates'),
('estimates.delete', 'Estimates', 'Delete estimates'),
('payments.view', 'Payments', 'View payments'),
('payments.create', 'Payments', 'Create payments'),
('payments.edit', 'Payments', 'Edit payments'),
('payments.delete', 'Payments', 'Delete payments'),
('expenses.view', 'Expenses', 'View expenses'),
('expenses.create', 'Expenses', 'Create expenses'),
('expenses.edit', 'Expenses', 'Edit expenses'),
('expenses.delete', 'Expenses', 'Delete expenses'),
('reports.view', 'Reports', 'View reports');

-- Note: Default admin password is 'Admin@123' (hashed with bcryptjs, salt rounds: 10)
-- To generate new password hash, use: bcrypt.hash('YourPassword', 10)

-- =====================================================
-- DEMO DATA FOR ALL TABLES
-- =====================================================

-- Additional Companies
INSERT INTO `companies` (`name`, `currency`, `timezone`) VALUES
('Tech Solutions Inc', 'USD', 'America/New_York'),
('Global Services Ltd', 'EUR', 'Europe/London'),
('Digital Marketing Co', 'INR', 'Asia/Kolkata');

-- =====================================================
-- DEMO USERS - ONE USER PER ROLE
-- =====================================================
-- User ID 2: EMPLOYEE - Demo Employee
-- Email: employee@demo.com
-- Password: Demo@123
-- 
-- User ID 3: CLIENT - Demo Client
-- Email: client@demo.com
-- Password: Demo@123
-- =====================================================
INSERT INTO `users` (`company_id`, `name`, `email`, `password`, `role`, `status`, `phone`, `address`) VALUES
(1, 'Demo Employee', 'employee@demo.com', '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq', 'EMPLOYEE', 'Active', '+1-555-0101', '123 Employee St, New York'),
(1, 'Demo Client', 'client@demo.com', '$2a$10$CyMeAtmMNZ478BjpE3FPBOHnRpOcDCmcc7KTM2atWJqiluvv/PTSq', 'CLIENT', 'Active', '+1-555-0201', '456 Client Ave, Chicago');

-- Roles
INSERT INTO `roles` (`company_id`, `role_name`, `description`) VALUES
(1, 'Manager', 'Manages team and projects'),
(1, 'Developer', 'Software development role'),
(1, 'Sales Executive', 'Handles sales and leads'),
(1, 'Accountant', 'Manages finances');

-- Role Permissions (Assign all permissions to Manager role)
INSERT INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT 1, `id` FROM `permissions` WHERE `id` <= 30;

-- Departments
INSERT INTO `departments` (`company_id`, `name`, `head_id`) VALUES
(1, 'Sales', 2),
(1, 'Development', 2),
(1, 'Marketing', 2),
(1, 'Finance', 1);

-- Positions
INSERT INTO `positions` (`company_id`, `department_id`, `name`, `description`) VALUES
(1, 1, 'Sales Manager', 'Manages sales team'),
(1, 1, 'Sales Executive', 'Handles client relationships'),
(1, 2, 'Senior Developer', 'Leads development projects'),
(1, 2, 'Junior Developer', 'Assists in development'),
(1, 3, 'Marketing Manager', 'Oversees marketing campaigns'),
(1, 4, 'Accountant', 'Manages financial records');

-- Employees (Only Employee role users)
INSERT INTO `employees` (`user_id`, `employee_number`, `department_id`, `position_id`, `role`, `joining_date`) VALUES
(2, 'EMP001', 1, 1, 'Manager', '2024-01-15');

-- Clients
INSERT INTO `clients` (`company_id`, `company_name`, `owner_id`, `address`, `city`, `state`, `country`, `phone_number`, `website`, `currency`, `status`) VALUES
(1, 'ABC Corporation', 2, '100 Corporate Blvd', 'New York', 'NY', 'United States', '+1-555-1001', 'https://abccorp.com', 'USD', 'Active'),
(1, 'XYZ Industries', 2, '200 Industrial Ave', 'Chicago', 'IL', 'United States', '+1-555-1002', 'https://xyzind.com', 'USD', 'Active'),
(1, 'Tech Startup LLC', 2, '300 Innovation Dr', 'San Francisco', 'CA', 'United States', '+1-555-1003', 'https://techstartup.io', 'USD', 'Active');

-- Client Contacts
INSERT INTO `client_contacts` (`client_id`, `name`, `job_title`, `email`, `phone`, `is_primary`) VALUES
(1, 'John Doe', 'CEO', 'john.doe@abccorp.com', '+1-555-2001', 1),
(1, 'Jane Smith', 'CFO', 'jane.smith@abccorp.com', '+1-555-2002', 0),
(2, 'Bob Johnson', 'Director', 'bob@xyzind.com', '+1-555-2003', 1),
(3, 'Alice Brown', 'Founder', 'alice@techstartup.io', '+1-555-2004', 1);

-- Client Managers
INSERT INTO `client_managers` (`client_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(3, 2);

-- Client Groups
INSERT INTO `client_groups` (`client_id`, `group_name`) VALUES
(1, 'Enterprise'),
(1, 'VIP'),
(2, 'Standard'),
(3, 'Startup');

-- Client Labels
INSERT INTO `client_labels` (`client_id`, `label`) VALUES
(1, 'High Value'),
(1, 'Long Term'),
(2, 'Regular'),
(3, 'New');

-- Leads
INSERT INTO `leads` (`company_id`, `lead_type`, `company_name`, `person_name`, `email`, `phone`, `owner_id`, `status`, `source`, `address`, `city`, `state`, `country`, `value`, `probability`, `created_by`) VALUES
(1, 'Organization', 'Future Corp', 'Mike Wilson', 'mike@futurecorp.com', '+1-555-3001', 2, 'Qualified', 'Website', '400 Future St', 'Boston', 'MA', 'United States', 50000.00, 75, 1),
(1, 'Person', NULL, 'Lisa Anderson', 'lisa@email.com', '+1-555-3002', 2, 'New', 'Referral', '500 Person Ave', 'Seattle', 'WA', 'United States', 25000.00, 50, 1),
(1, 'Organization', 'NextGen Solutions', 'Tom Davis', 'tom@nextgen.com', '+1-555-3003', 2, 'Discussion', 'Social Media', '600 Next St', 'Austin', 'TX', 'United States', 75000.00, 60, 1);

-- Lead Managers
INSERT INTO `lead_managers` (`lead_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(3, 2);

-- Lead Labels
INSERT INTO `lead_labels` (`lead_id`, `label`) VALUES
(1, 'Hot Lead'),
(2, 'Warm Lead'),
(3, 'Cold Lead');

-- Projects
INSERT INTO `projects` (`company_id`, `short_code`, `project_name`, `start_date`, `deadline`, `client_id`, `project_summary`, `status`, `progress`, `created_by`) VALUES
(1, 'PROJ001', 'Website Redesign', '2024-12-01', '2025-02-28', 1, 'Complete website redesign for ABC Corporation', 'in progress', 45, 1),
(1, 'PROJ002', 'Mobile App Development', '2024-12-15', '2025-04-30', 2, 'iOS and Android app development', 'in progress', 20, 1),
(1, 'PROJ003', 'Marketing Campaign', '2024-11-01', '2025-01-31', 3, 'Q1 marketing campaign execution', 'in progress', 70, 1);

-- Project Members (Only Employee users)
INSERT INTO `project_members` (`project_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(3, 2);

-- Tasks
INSERT INTO `tasks` (`company_id`, `code`, `title`, `sub_description`, `project_id`, `start_date`, `due_date`, `status`, `priority`, `created_by`) VALUES
(1, 'TASK-1001', 'Design Homepage', 'Create new homepage design', 1, '2024-12-01', '2024-12-15', 'Doing', 'High', 1),
(1, 'TASK-1002', 'Develop Contact Form', 'Build contact form functionality', 1, '2024-12-10', '2024-12-20', 'Incomplete', 'Medium', 1),
(1, 'TASK-1003', 'Test Responsive Design', 'Test on multiple devices', 1, '2024-12-20', '2024-12-25', 'Incomplete', 'High', 1),
(2, 'TASK-1004', 'Setup Development Environment', 'Configure iOS and Android dev tools', 2, '2024-12-15', '2024-12-22', 'Done', 'High', 1),
(2, 'TASK-1005', 'Create API Endpoints', 'Develop backend APIs', 2, '2024-12-20', '2025-01-05', 'Doing', 'High', 1);

-- Task Assignees (Only Employee users)
INSERT INTO `task_assignees` (`task_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(3, 2),
(4, 2),
(5, 2);

-- Task Tags
INSERT INTO `task_tags` (`task_id`, `tag`) VALUES
(1, 'Design'),
(1, 'Frontend'),
(2, 'Development'),
(2, 'Backend'),
(3, 'Testing'),
(4, 'Setup'),
(5, 'API');

-- Contracts
INSERT INTO `contracts` (`company_id`, `contract_number`, `title`, `contract_date`, `valid_until`, `client_id`, `project_id`, `tax`, `second_tax`, `amount`, `status`, `created_by`) VALUES
(1, 'CONTRACT #21', 'Website Development Agreement', '2024-12-23', '2025-12-24', 1, 1, 'GST: 10%', NULL, 50000.00, 'Draft', 1),
(1, 'CONTRACT #20', 'Mobile App Development Contract', '2024-11-17', '2025-01-17', 2, 2, 'VAT: 10%', NULL, 100000.00, 'Accepted', 1),
(1, 'CONTRACT #19', 'Marketing Services Agreement', '2024-10-29', '2024-12-29', 3, 3, 'GST: 10%', NULL, 25000.00, 'Accepted', 1);

-- Subscriptions
INSERT INTO `subscriptions` (`company_id`, `client_id`, `plan`, `amount`, `billing_cycle`, `status`, `next_billing_date`) VALUES
(1, 1, 'Enterprise Plan', 999.00, 'Monthly', 'Active', '2025-01-15'),
(1, 2, 'Professional Plan', 499.00, 'Monthly', 'Active', '2025-01-20'),
(1, 3, 'Starter Plan', 199.00, 'Monthly', 'Active', '2025-01-10');

-- Invoices
INSERT INTO `invoices` (`company_id`, `invoice_number`, `invoice_date`, `due_date`, `currency`, `client_id`, `project_id`, `calculate_tax`, `discount`, `discount_type`, `sub_total`, `discount_amount`, `tax_amount`, `total`, `paid`, `unpaid`, `status`, `created_by`) VALUES
(1, 'INV-001', '2024-12-01', '2024-12-31', 'USD', 1, 1, 'After Discount', 10.00, '%', 10000.00, 1000.00, 900.00, 9900.00, 5000.00, 4900.00, 'Partially Paid', 1),
(1, 'INV-002', '2024-12-15', '2025-01-15', 'USD', 2, 2, 'After Discount', 0.00, '%', 25000.00, 0.00, 2500.00, 27500.00, 0.00, 27500.00, 'Unpaid', 1),
(1, 'INV-003', '2024-11-20', '2024-12-20', 'USD', 3, 3, 'After Discount', 5.00, '%', 5000.00, 250.00, 475.00, 5225.00, 5225.00, 0.00, 'Paid', 1);

-- Invoice Items
INSERT INTO `invoice_items` (`invoice_id`, `item_name`, `description`, `quantity`, `unit`, `unit_price`, `tax`, `tax_rate`, `amount`) VALUES
(1, 'Website Design', 'Homepage and inner pages design', 10.00, 'Hours', 500.00, 'GST: 10%', 10.00, 5500.00),
(1, 'Development', 'Frontend development work', 8.00, 'Hours', 400.00, 'GST: 10%', 10.00, 3520.00),
(1, 'Testing', 'QA and testing services', 2.00, 'Hours', 300.00, 'GST: 10%', 10.00, 660.00),
(2, 'Mobile App Development', 'iOS and Android app', 50.00, 'Hours', 400.00, 'VAT: 10%', 10.00, 22000.00),
(2, 'Backend API', 'RESTful API development', 10.00, 'Hours', 300.00, 'VAT: 10%', 10.00, 3300.00),
(3, 'Marketing Campaign', 'Q1 marketing campaign', 1.00, 'Pcs', 5000.00, 'GST: 10%', 10.00, 5500.00);

-- Estimates
INSERT INTO `estimates` (`company_id`, `estimate_number`, `valid_till`, `currency`, `client_id`, `project_id`, `calculate_tax`, `discount`, `discount_type`, `sub_total`, `discount_amount`, `tax_amount`, `total`, `status`, `created_by`) VALUES
(1, 'EST-001', '2025-01-20', 'USD', 1, NULL, 'After Discount', 0.00, '%', 15000.00, 0.00, 1500.00, 16500.00, 'Waiting', 1),
(1, 'EST-002', '2025-02-15', 'USD', 2, NULL, 'After Discount', 5.00, '%', 30000.00, 1500.00, 2850.00, 31350.00, 'Waiting', 1),
(1, 'EST-003', '2025-01-10', 'USD', 3, NULL, 'After Discount', 10.00, '%', 8001.00, 800.00, 720.00, 7920.00, 'Accepted', 1);

-- Estimate Items
INSERT INTO `estimate_items` (`estimate_id`, `item_name`, `description`, `quantity`, `unit`, `unit_price`, `tax`, `tax_rate`, `amount`) VALUES
(1, 'Consultation Services', 'Initial consultation and planning', 20.00, 'Hours', 500.00, 'GST: 10%', 10.00, 11000.00),
(1, 'Design Mockups', 'UI/UX design mockups', 8.00, 'Hours', 500.00, 'GST: 10%', 10.00, 4400.00),
(2, 'Full Stack Development', 'Complete application development', 60.00, 'Hours', 400.00, 'VAT: 10%', 10.00, 26400.00),
(2, 'Deployment', 'Server setup and deployment', 10.00, 'Hours', 300.00, 'VAT: 10%', 10.00, 3300.00),
(3, 'SEO Services', 'Search engine optimization', 1.00, 'Pcs', 8001.00, 'GST: 10%', 10.00, 8800.00);

-- Payments
INSERT INTO `payments` (`company_id`, `invoice_id`, `project_id`, `paid_on`, `amount`, `currency`, `exchange_rate`, `transaction_id`, `payment_gateway`, `bank_account`, `status`, `created_by`) VALUES
(1, 1, 1, '2024-12-05', 5000.00, 'USD', 1.0000, 'TXN-001', 'Stripe', 'Primary Account', 'Complete', 1),
(1, 3, 3, '2024-11-25', 5225.00, 'USD', 1.0000, 'TXN-002', 'PayPal', 'Primary Account', 'Complete', 1),
(1, 1, 1, '2024-12-21', 2000.00, 'USD', 1.0000, 'TXN-003', 'Bank Transfer', 'Secondary Account', 'Complete', 1);

-- Expenses
INSERT INTO `expenses` (`company_id`, `expense_number`, `currency`, `calculate_tax`, `description`, `sub_total`, `discount_amount`, `tax_amount`, `total`, `status`, `created_by`) VALUES
(1, 'EXP-001', 'USD', 'After Discount', 'Office supplies purchase', 500.00, 0.00, 50.00, 550.00, 'Approved', 1),
(1, 'EXP-002', 'USD', 'After Discount', 'Software licenses', 1200.00, 60.00, 114.00, 1254.00, 'Pending', 1),
(1, 'EXP-003', 'USD', 'After Discount', 'Travel expenses', 800.00, 0.00, 80.00, 880.00, 'Paid', 1);

-- Expense Items
INSERT INTO `expense_items` (`expense_id`, `item_name`, `description`, `quantity`, `unit`, `unit_price`, `tax`, `tax_rate`, `amount`) VALUES
(1, 'Stationery', 'Pens, papers, folders', 50.00, 'Pcs', 10.00, 'GST: 10%', 10.00, 550.00),
(2, 'Adobe Creative Suite', 'Annual subscription', 1.00, 'Pcs', 1200.00, 'GST: 10%', 10.00, 1320.00),
(3, 'Flight Tickets', 'Client meeting travel', 2.00, 'Pcs', 400.00, 'GST: 10%', 10.00, 880.00);

-- Credit Notes
INSERT INTO `credit_notes` (`company_id`, `credit_note_number`, `invoice_id`, `amount`, `date`, `reason`, `status`, `created_by`) VALUES
(1, 'CN-001', 1, 500.00, '2024-12-10', 'Discount adjustment', 'Approved', 1);

-- Attendance (Only Employee users)
INSERT INTO `attendance` (`company_id`, `user_id`, `date`, `check_in`, `check_out`, `status`) VALUES
(1, 2, '2024-12-20', '09:00:00', '18:00:00', 'Present'),
(1, 2, '2024-12-21', '09:15:00', '18:30:00', 'Late');

-- Time Logs (Only Employee users)
INSERT INTO `time_logs` (`company_id`, `user_id`, `project_id`, `task_id`, `hours`, `date`, `description`) VALUES
(1, 2, 1, 1, 8.00, '2024-12-20', 'Worked on homepage design'),
(1, 2, 1, 3, 4.00, '2024-12-21', 'Responsive design testing'),
(1, 2, 1, 2, 6.00, '2024-12-20', 'Contact form development'),
(1, 2, 2, 5, 8.00, '2024-12-21', 'API endpoint development');

-- Events
INSERT INTO `events` (`company_id`, `event_name`, `label_color`, `where`, `description`, `starts_on_date`, `starts_on_time`, `ends_on_date`, `ends_on_time`, `host_id`, `status`, `created_by`) VALUES
(1, 'Team Meeting', '#FF0000', 'Conference Room A', 'Weekly team sync meeting', '2024-12-25', '10:00:00', '2024-12-25', '11:00:00', 2, 'Confirmed', 1),
(1, 'Client Presentation', '#00FF00', 'Client Office', 'Project presentation to ABC Corp', '2024-12-28', '14:00:00', '2024-12-28', '16:00:00', 2, 'Pending', 1),
(1, 'Training Session', '#0000FF', 'Training Hall', 'New tool training for team', '2025-01-05', '09:00:00', '2025-01-05', '17:00:00', 2, 'Confirmed', 1);

-- Event Departments
INSERT INTO `event_departments` (`event_id`, `department_id`) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 2);

-- Event Employees (Only Employee users)
INSERT INTO `event_employees` (`event_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(3, 2);

-- Event Clients
INSERT INTO `event_clients` (`event_id`, `client_id`) VALUES
(2, 1);

-- Leave Requests (Only Employee users)
INSERT INTO `leave_requests` (`company_id`, `user_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `applied_on`) VALUES
(1, 2, 'Annual Leave', '2025-01-10', '2025-01-12', 'Personal vacation', 'Pending', '2024-12-20');

-- Messages (Admin to Employee, Employee to Admin, Admin to Client)
INSERT INTO `messages` (`company_id`, `from_user_id`, `to_user_id`, `subject`, `message`, `is_read`) VALUES
(1, 1, 2, 'Project Update Required', 'Please provide update on Project PROJ001', 1),
(1, 2, 1, 'Re: Project Update Required', 'Update sent. Please review.', 0),
(1, 1, 3, 'Invoice Notification', 'Your invoice INV-001 is ready for review', 1);

-- Message Recipients
INSERT INTO `message_recipients` (`message_id`, `user_id`, `is_read`) VALUES
(1, 2, 1),
(2, 1, 0),
(3, 3, 1);

-- Tickets
INSERT INTO `tickets` (`company_id`, `ticket_id`, `subject`, `client_id`, `priority`, `description`, `status`, `assigned_to_id`, `created_by`) VALUES
(1, 'TKT-001', 'Website Loading Issue', 1, 'High', 'Homepage is loading slowly', 'Open', 2, 1),
(1, 'TKT-002', 'Feature Request', 2, 'Medium', 'Need additional reporting feature', 'Pending', 2, 1),
(1, 'TKT-003', 'Payment Gateway Error', 3, 'High', 'Payment not processing', 'Closed', 2, 1);

-- Ticket Comments
INSERT INTO `ticket_comments` (`ticket_id`, `user_id`, `comment`) VALUES
(1, 2, 'Investigating the issue. Will update soon.'),
(1, 1, 'Thanks for quick response.'),
(2, 2, 'Feature request noted. Will discuss with team.');

-- Notifications (For all roles)
INSERT INTO `notifications` (`company_id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`) VALUES
(1, 2, 'task_assigned', 'New Task Assigned', 'You have been assigned to TASK-1001', '/tasks/1', 0),
(1, 3, 'invoice_created', 'New Invoice Created', 'Invoice INV-001 has been created for you', '/invoices/1', 1),
(1, 1, 'payment_received', 'Payment Received', 'Payment of $5000 received for INV-001', '/payments/1', 1);

-- Custom Fields
INSERT INTO `custom_fields` (`company_id`, `name`, `label`, `type`, `module`, `required`, `placeholder`, `help_text`) VALUES
(1, 'client_industry', 'Industry', 'dropdown', 'clients', 0, 'Select industry', 'Client industry sector'),
(1, 'lead_score', 'Lead Score', 'number', 'leads', 0, 'Enter score 0-100', 'Lead qualification score'),
(1, 'project_budget', 'Project Budget', 'number', 'projects', 0, 'Enter budget amount', 'Total project budget');

-- Custom Field Options
INSERT INTO `custom_field_options` (`custom_field_id`, `option_value`, `display_order`) VALUES
(1, 'Technology', 1),
(1, 'Healthcare', 2),
(1, 'Finance', 3),
(1, 'Retail', 4),
(1, 'Manufacturing', 5);

-- Custom Field Visibility
INSERT INTO `custom_field_visibility` (`custom_field_id`, `visibility`) VALUES
(1, 'all'),
(2, 'admin'),
(2, 'employee'),
(3, 'all');

-- Custom Field Enabled In
INSERT INTO `custom_field_enabled_in` (`custom_field_id`, `enabled_in`) VALUES
(1, 'create'),
(1, 'edit'),
(1, 'table'),
(1, 'filters'),
(2, 'create'),
(2, 'edit'),
(2, 'table'),
(3, 'create'),
(3, 'edit'),
(3, 'table');

-- Email Templates
INSERT INTO `email_templates` (`company_id`, `name`, `subject`, `body`, `type`) VALUES
(1, 'Invoice Email', 'Invoice {{invoice_number}} from {{company_name}}', 'Dear {{client_name}},\n\nPlease find attached invoice {{invoice_number}} for {{amount}}.\n\nThank you for your business.', 'invoice'),
(1, 'Welcome Email', 'Welcome to {{company_name}}', 'Dear {{user_name}},\n\nWelcome to our platform. We are excited to have you on board.', 'welcome'),
(1, 'Task Assignment', 'New Task Assigned: {{task_title}}', 'Hi {{user_name}},\n\nYou have been assigned to a new task: {{task_title}}.\n\nDue Date: {{due_date}}', 'task');

-- Finance Templates
INSERT INTO `finance_templates` (`company_id`, `name`, `type`, `template_data`) VALUES
(1, 'Standard Invoice Template', 'invoice', '{"header": "Invoice", "footer": "Thank you for your business"}'),
(1, 'Detailed Estimate Template', 'estimate', '{"header": "Estimate", "show_tax": true, "show_discount": true}'),
(1, 'Expense Report Template', 'expense', '{"header": "Expense Report", "require_approval": true}');

-- Documents
INSERT INTO `documents` (`company_id`, `user_id`, `title`, `category`, `file_path`, `file_name`, `file_size`, `file_type`, `description`) VALUES
(1, 1, 'Company Policy', 'Policy', '/uploads/policy.pdf', 'company_policy.pdf', 1024000, 'application/pdf', 'Company HR policy document'),
(1, 2, 'Project Proposal', 'Proposal', '/uploads/proposal.pdf', 'project_proposal.pdf', 2048001, 'application/pdf', 'Project proposal for client'),
(1, NULL, 'User Guide', 'Documentation', '/uploads/guide.pdf', 'user_guide.pdf', 1536000, 'application/pdf', 'User manual and guide');

-- Social Leads
INSERT INTO `social_leads` (`company_id`, `platform`, `lead_data`, `status`) VALUES
(1, 'Facebook', '{"name": "Social Lead 1", "email": "social1@example.com", "phone": "+1-555-4001"}', 'New'),
(1, 'LinkedIn', '{"name": "Social Lead 2", "email": "social2@example.com", "phone": "+1-555-4002"}', 'Qualified'),
(1, 'Twitter', '{"name": "Social Lead 3", "email": "social3@example.com", "phone": "+1-555-4003"}', 'New');

-- Company Packages
INSERT INTO `company_packages` (`company_id`, `package_name`, `features`, `price`, `billing_cycle`, `status`) VALUES
(1, 'Starter', '["5 Users", "10 Projects", "Basic Support"]', 99.00, 'Monthly', 'Active'),
(1, 'Professional', '["20 Users", "Unlimited Projects", "Priority Support"]', 299.00, 'Monthly', 'Active'),
(1, 'Enterprise', '["Unlimited Users", "Unlimited Projects", "24/7 Support", "Custom Features"]', 999.00, 'Monthly', 'Active');

-- System Settings
INSERT INTO `system_settings` (`company_id`, `setting_key`, `setting_value`, `setting_type`) VALUES
(1, 'company_name', 'Default Company', 'string'),
(1, 'timezone', 'UTC', 'string'),
(1, 'currency', 'USD', 'string'),
(1, 'invoice_prefix', 'INV-', 'string'),
(1, 'estimate_prefix', 'EST-', 'string'),
(1, 'task_prefix', 'TASK-', 'string'),
(NULL, 'system_version', '1.0.0', 'string'),
(NULL, 'maintenance_mode', 'false', 'boolean');

-- Audit Logs
INSERT INTO `audit_logs` (`company_id`, `user_id`, `action`, `module`, `record_id`, `old_values`, `new_values`, `ip_address`) VALUES
(1, 1, 'create', 'clients', 1, NULL, '{"company_name": "ABC Corporation"}', '127.0.0.1'),
(1, 1, 'create', 'invoices', 1, NULL, '{"invoice_number": "INV-001", "total": 9900.00}', '127.0.0.1'),
(1, 2, 'update', 'tasks', 1, '{"status": "Incomplete"}', '{"status": "Doing"}', '127.0.0.1'),
(1, 1, 'delete', 'leads', 1, '{"email": "old@example.com"}', NULL, '127.0.0.1');

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (After all tables created)
-- =====================================================

-- Add foreign key from companies to company_packages
ALTER TABLE `companies`
ADD CONSTRAINT `fk_company_package`
FOREIGN KEY (`package_id`) REFERENCES `company_packages`(`id`) ON DELETE SET NULL;

-- Add foreign key from company_packages to companies
ALTER TABLE `company_packages`
ADD CONSTRAINT `fk_company_packages_company`
FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;

-- Estimate Items
INSERT INTO `estimate_items` (`estimate_id`, `item_name`, `description`, `quantity`, `unit`, `unit_price`, `tax`, `tax_rate`, `amount`) VALUES
(1, 'Consultation Services', 'Initial consultation and planning', 20.00, 'Hours', 500.00, 'GST: 10%', 10.00, 11000.00),
(1, 'Design Mockups', 'UI/UX design mockups', 8.00, 'Hours', 500.00, 'GST: 10%', 10.00, 4400.00),
(2, 'Full Stack Development', 'Complete application development', 60.00, 'Hours', 400.00, 'VAT: 10%', 10.00, 26400.00),
(2, 'Deployment', 'Server setup and deployment', 10.00, 'Hours', 300.00, 'VAT: 10%', 10.00, 3300.00),
(3, 'SEO Services', 'Search engine optimization', 1.00, 'Pcs', 8001.00, 'GST: 10%', 10.00, 8800.00);

-- Payments
INSERT INTO `payments` (`company_id`, `invoice_id`, `project_id`, `paid_on`, `amount`, `currency`, `exchange_rate`, `transaction_id`, `payment_gateway`, `bank_account`, `status`, `created_by`) VALUES
(1, 1, 1, '2024-12-05', 5000.00, 'USD', 1.0000, 'TXN-001', 'Stripe', 'Primary Account', 'Complete', 1),
(1, 3, 3, '2024-11-25', 5225.00, 'USD', 1.0000, 'TXN-002', 'PayPal', 'Primary Account', 'Complete', 1),
(1, 1, 1, '2024-12-21', 2000.00, 'USD', 1.0000, 'TXN-003', 'Bank Transfer', 'Secondary Account', 'Complete', 1);

-- Expenses
INSERT INTO `expenses` (`company_id`, `expense_number`, `currency`, `calculate_tax`, `description`, `sub_total`, `discount_amount`, `tax_amount`, `total`, `status`, `created_by`) VALUES
(1, 'EXP-001', 'USD', 'After Discount', 'Office supplies purchase', 500.00, 0.00, 50.00, 550.00, 'Approved', 1),
(1, 'EXP-002', 'USD', 'After Discount', 'Software licenses', 1200.00, 60.00, 114.00, 1254.00, 'Pending', 1),
(1, 'EXP-003', 'USD', 'After Discount', 'Travel expenses', 800.00, 0.00, 80.00, 880.00, 'Paid', 1);

-- Expense Items
INSERT INTO `expense_items` (`expense_id`, `item_name`, `description`, `quantity`, `unit`, `unit_price`, `tax`, `tax_rate`, `amount`) VALUES
(1, 'Stationery', 'Pens, papers, folders', 50.00, 'Pcs', 10.00, 'GST: 10%', 10.00, 550.00),
(2, 'Adobe Creative Suite', 'Annual subscription', 1.00, 'Pcs', 1200.00, 'GST: 10%', 10.00, 1320.00),
(3, 'Flight Tickets', 'Client meeting travel', 2.00, 'Pcs', 400.00, 'GST: 10%', 10.00, 880.00);

-- Credit Notes
INSERT INTO `credit_notes` (`company_id`, `credit_note_number`, `invoice_id`, `amount`, `date`, `reason`, `status`, `created_by`) VALUES
(1, 'CN-001', 1, 500.00, '2024-12-10', 'Discount adjustment', 'Approved', 1);

-- Attendance (Only Employee users)
INSERT INTO `attendance` (`company_id`, `user_id`, `date`, `check_in`, `check_out`, `status`) VALUES
(1, 2, '2024-12-20', '09:00:00', '18:00:00', 'Present'),
(1, 2, '2024-12-21', '09:15:00', '18:30:00', 'Late');

-- Time Logs (Only Employee users)
INSERT INTO `time_logs` (`company_id`, `user_id`, `project_id`, `task_id`, `hours`, `date`, `description`) VALUES
(1, 2, 1, 1, 8.00, '2024-12-20', 'Worked on homepage design'),
(1, 2, 1, 3, 4.00, '2024-12-21', 'Responsive design testing'),
(1, 2, 1, 2, 6.00, '2024-12-20', 'Contact form development'),
(1, 2, 2, 5, 8.00, '2024-12-21', 'API endpoint development');

-- Events
INSERT INTO `events` (`company_id`, `event_name`, `label_color`, `where`, `description`, `starts_on_date`, `starts_on_time`, `ends_on_date`, `ends_on_time`, `host_id`, `status`, `created_by`) VALUES
(1, 'Team Meeting', '#FF0000', 'Conference Room A', 'Weekly team sync meeting', '2024-12-25', '10:00:00', '2024-12-25', '11:00:00', 2, 'Confirmed', 1),
(1, 'Client Presentation', '#00FF00', 'Client Office', 'Project presentation to ABC Corp', '2024-12-28', '14:00:00', '2024-12-28', '16:00:00', 2, 'Pending', 1),
(1, 'Training Session', '#0000FF', 'Training Hall', 'New tool training for team', '2025-01-05', '09:00:00', '2025-01-05', '17:00:00', 2, 'Confirmed', 1);

-- Event Departments
INSERT INTO `event_departments` (`event_id`, `department_id`) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 2);

-- Event Employees (Only Employee users)
INSERT INTO `event_employees` (`event_id`, `user_id`) VALUES
(1, 2),
(2, 2),
(3, 2);

-- Event Clients
INSERT INTO `event_clients` (`event_id`, `client_id`) VALUES
(2, 1);

-- Leave Requests (Only Employee users)
INSERT INTO `leave_requests` (`company_id`, `user_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `applied_on`) VALUES
(1, 2, 'Annual Leave', '2025-01-10', '2025-01-12', 'Personal vacation', 'Pending', '2024-12-20');

-- Messages (Admin to Employee, Employee to Admin, Admin to Client)
INSERT INTO `messages` (`company_id`, `from_user_id`, `to_user_id`, `subject`, `message`, `is_read`) VALUES
(1, 1, 2, 'Project Update Required', 'Please provide update on Project PROJ001', 1),
(1, 2, 1, 'Re: Project Update Required', 'Update sent. Please review.', 0),
(1, 1, 3, 'Invoice Notification', 'Your invoice INV-001 is ready for review', 1);

-- Message Recipients
INSERT INTO `message_recipients` (`message_id`, `user_id`, `is_read`) VALUES
(1, 2, 1),
(2, 1, 0),
(3, 3, 1);

-- Tickets
INSERT INTO `tickets` (`company_id`, `ticket_id`, `subject`, `client_id`, `priority`, `description`, `status`, `assigned_to_id`, `created_by`) VALUES
(1, 'TKT-001', 'Website Loading Issue', 1, 'High', 'Homepage is loading slowly', 'Open', 2, 1),
(1, 'TKT-002', 'Feature Request', 2, 'Medium', 'Need additional reporting feature', 'Pending', 2, 1),
(1, 'TKT-003', 'Payment Gateway Error', 3, 'High', 'Payment not processing', 'Closed', 2, 1);

-- Ticket Comments
INSERT INTO `ticket_comments` (`ticket_id`, `user_id`, `comment`) VALUES
(1, 2, 'Investigating the issue. Will update soon.'),
(1, 1, 'Thanks for quick response.'),
(2, 2, 'Feature request noted. Will discuss with team.');

-- Notifications (For all roles)
INSERT INTO `notifications` (`company_id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`) VALUES
(1, 2, 'task_assigned', 'New Task Assigned', 'You have been assigned to TASK-1001', '/tasks/1', 0),
(1, 3, 'invoice_created', 'New Invoice Created', 'Invoice INV-001 has been created for you', '/invoices/1', 1),
(1, 1, 'payment_received', 'Payment Received', 'Payment of $5000 received for INV-001', '/payments/1', 1);

-- Custom Fields
INSERT INTO `custom_fields` (`company_id`, `name`, `label`, `type`, `module`, `required`, `placeholder`, `help_text`) VALUES
(1, 'client_industry', 'Industry', 'dropdown', 'clients', 0, 'Select industry', 'Client industry sector'),
(1, 'lead_score', 'Lead Score', 'number', 'leads', 0, 'Enter score 0-100', 'Lead qualification score'),
(1, 'project_budget', 'Project Budget', 'number', 'projects', 0, 'Enter budget amount', 'Total project budget');

-- Custom Field Options
INSERT INTO `custom_field_options` (`custom_field_id`, `option_value`, `display_order`) VALUES
(1, 'Technology', 1),
(1, 'Healthcare', 2),
(1, 'Finance', 3),
(1, 'Retail', 4),
(1, 'Manufacturing', 5);

-- Custom Field Visibility
INSERT INTO `custom_field_visibility` (`custom_field_id`, `visibility`) VALUES
(1, 'all'),
(2, 'admin'),
(2, 'employee'),
(3, 'all');

-- Custom Field Enabled In
INSERT INTO `custom_field_enabled_in` (`custom_field_id`, `enabled_in`) VALUES
(1, 'create'),
(1, 'edit'),
(1, 'table'),
(1, 'filters'),
(2, 'create'),
(2, 'edit'),
(2, 'table'),
(3, 'create'),
(3, 'edit'),
(3, 'table');

-- Email Templates
INSERT INTO `email_templates` (`company_id`, `name`, `subject`, `body`, `type`) VALUES
(1, 'Invoice Email', 'Invoice {{invoice_number}} from {{company_name}}', 'Dear {{client_name}},\n\nPlease find attached invoice {{invoice_number}} for {{amount}}.\n\nThank you for your business.', 'invoice'),
(1, 'Welcome Email', 'Welcome to {{company_name}}', 'Dear {{user_name}},\n\nWelcome to our platform. We are excited to have you on board.', 'welcome'),
(1, 'Task Assignment', 'New Task Assigned: {{task_title}}', 'Hi {{user_name}},\n\nYou have been assigned to a new task: {{task_title}}.\n\nDue Date: {{due_date}}', 'task');

-- Finance Templates
INSERT INTO `finance_templates` (`company_id`, `name`, `type`, `template_data`) VALUES
(1, 'Standard Invoice Template', 'invoice', '{"header": "Invoice", "footer": "Thank you for your business"}'),
(1, 'Detailed Estimate Template', 'estimate', '{"header": "Estimate", "show_tax": true, "show_discount": true}'),
(1, 'Expense Report Template', 'expense', '{"header": "Expense Report", "require_approval": true}');

-- Documents
INSERT INTO `documents` (`company_id`, `user_id`, `title`, `category`, `file_path`, `file_name`, `file_size`, `file_type`, `description`) VALUES
(1, 1, 'Company Policy', 'Policy', '/uploads/policy.pdf', 'company_policy.pdf', 1024000, 'application/pdf', 'Company HR policy document'),
(1, 2, 'Project Proposal', 'Proposal', '/uploads/proposal.pdf', 'project_proposal.pdf', 2048001, 'application/pdf', 'Project proposal for client'),
(1, NULL, 'User Guide', 'Documentation', '/uploads/guide.pdf', 'user_guide.pdf', 1536000, 'application/pdf', 'User manual and guide');

-- Social Leads
INSERT INTO `social_leads` (`company_id`, `platform`, `lead_data`, `status`) VALUES
(1, 'Facebook', '{"name": "Social Lead 1", "email": "social1@example.com", "phone": "+1-555-4001"}', 'New'),
(1, 'LinkedIn', '{"name": "Social Lead 2", "email": "social2@example.com", "phone": "+1-555-4002"}', 'Qualified'),
(1, 'Twitter', '{"name": "Social Lead 3", "email": "social3@example.com", "phone": "+1-555-4003"}', 'New');

-- Company Packages
INSERT INTO `company_packages` (`company_id`, `package_name`, `features`, `price`, `billing_cycle`, `status`) VALUES
(1, 'Starter', '["5 Users", "10 Projects", "Basic Support"]', 99.00, 'Monthly', 'Active'),
(1, 'Professional', '["20 Users", "Unlimited Projects", "Priority Support"]', 299.00, 'Monthly', 'Active'),
(1, 'Enterprise', '["Unlimited Users", "Unlimited Projects", "24/7 Support", "Custom Features"]', 999.00, 'Monthly', 'Active');

-- System Settings
INSERT INTO `system_settings` (`company_id`, `setting_key`, `setting_value`, `setting_type`) VALUES
(1, 'company_name', 'Default Company', 'string'),
(1, 'timezone', 'UTC', 'string'),
(1, 'currency', 'USD', 'string'),
(1, 'invoice_prefix', 'INV-', 'string'),
(1, 'estimate_prefix', 'EST-', 'string'),
(1, 'task_prefix', 'TASK-', 'string'),
(NULL, 'system_version', '1.0.0', 'string'),
(NULL, 'maintenance_mode', 'false', 'boolean');

-- Audit Logs
INSERT INTO `audit_logs` (`company_id`, `user_id`, `action`, `module`, `record_id`, `old_values`, `new_values`, `ip_address`) VALUES
(1, 1, 'create', 'clients', 1, NULL, '{"company_name": "ABC Corporation"}', '127.0.0.1'),
(1, 1, 'create', 'invoices', 1, NULL, '{"invoice_number": "INV-001", "total": 9900.00}', '127.0.0.1'),
(1, 2, 'update', 'tasks', 1, '{"status": "Incomplete"}', '{"status": "Doing"}', '127.0.0.1'),
(1, 1, 'delete', 'leads', 1, '{"email": "old@example.com"}', NULL, '127.0.0.1');

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (After all tables created)
-- =====================================================

-- Add foreign key from companies to company_packages
ALTER TABLE `companies`
ADD CONSTRAINT `fk_company_package`
FOREIGN KEY (`package_id`) REFERENCES `company_packages`(`id`) ON DELETE SET NULL;

-- Add foreign key from company_packages to companies
ALTER TABLE `company_packages`
ADD CONSTRAINT `fk_company_packages_company`
FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Offers
CREATE TABLE IF NOT EXISTS `offers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `offer_number` VARCHAR(50) NOT NULL UNIQUE,
  `valid_till` DATE NOT NULL,
  `offer_date` DATE NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `client_id` INT UNSIGNED NULL,
  `lead_id` INT UNSIGNED NULL,
  `project_id` INT UNSIGNED NULL,
  `calculate_tax` ENUM('After Discount', 'Before Discount') DEFAULT 'After Discount',
  `description` TEXT NULL,
  `note` TEXT NULL,
  `terms` TEXT DEFAULT 'Thank you for your business.',
  `discount` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_type` ENUM('%', 'fixed') DEFAULT '%',
  `sub_total` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax` VARCHAR(50) NULL,
  `second_tax` VARCHAR(50) NULL,
  `total` DECIMAL(15, 2) DEFAULT 0.00,
  `status` ENUM('Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Waiting') DEFAULT 'Draft',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Offer Items
CREATE TABLE IF NOT EXISTS `offer_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `offer_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `quantity` DECIMAL(10, 2) DEFAULT 1.00,
  `unit` ENUM('Pcs', 'Kg', 'Hours', 'Days') DEFAULT 'Pcs',
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `tax` VARCHAR(50) NULL,
  `tax_rate` DECIMAL(5, 2) DEFAULT 0.00,
  `file_path` VARCHAR(500) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deals
CREATE TABLE IF NOT EXISTS `deals` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `deal_number` VARCHAR(50) NOT NULL UNIQUE,
  `valid_till` DATE NOT NULL,
  `deal_date` DATE NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `client_id` INT UNSIGNED NULL,
  `lead_id` INT UNSIGNED NULL,
  `project_id` INT UNSIGNED NULL,
  `title` VARCHAR(255) NULL,
  `calculate_tax` ENUM('After Discount', 'Before Discount') DEFAULT 'After Discount',
  `description` TEXT NULL,
  `note` TEXT NULL,
  `terms` TEXT DEFAULT 'Thank you for your business.',
  `discount` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_type` ENUM('%', 'fixed') DEFAULT '%',
  `sub_total` DECIMAL(15, 2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `tax` VARCHAR(50) NULL,
  `second_tax` VARCHAR(50) NULL,
  `total` DECIMAL(15, 2) DEFAULT 0.00,
  `status` ENUM('Draft', 'Sent', 'Accepted', 'Declined', 'Expired') DEFAULT 'Draft',
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deal Items
CREATE TABLE IF NOT EXISTS `deal_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `deal_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `quantity` DECIMAL(10, 2) DEFAULT 1.00,
  `unit` ENUM('Pcs', 'Kg', 'Hours', 'Days') DEFAULT 'Pcs',
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `tax` VARCHAR(50) NULL,
  `tax_rate` DECIMAL(5, 2) DEFAULT 0.00,
  `file_path` VARCHAR(500) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;