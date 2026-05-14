-- =====================================================
-- Create ALL Missing Tables - Complete Migration Script
-- Run this script to create all missing tables from schema.sql
-- This script uses CREATE TABLE IF NOT EXISTS, so it's safe to run multiple times
-- =====================================================

USE crm_db;

-- =====================================================
-- 1. CONTRACTS & SUBSCRIPTIONS MODULE
-- =====================================================

-- Contracts
CREATE TABLE IF NOT EXISTS `contracts` (
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
CREATE TABLE IF NOT EXISTS `subscriptions` (
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
-- 2. FINANCE MODULE
-- =====================================================

-- Invoices
CREATE TABLE IF NOT EXISTS `invoices` (
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
CREATE TABLE IF NOT EXISTS `invoice_items` (
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
CREATE TABLE IF NOT EXISTS `estimates` (
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
CREATE TABLE IF NOT EXISTS `estimate_items` (
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
CREATE TABLE IF NOT EXISTS `payments` (
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
CREATE TABLE IF NOT EXISTS `expenses` (
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
CREATE TABLE IF NOT EXISTS `expense_items` (
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

-- =====================================================
-- 3. TEAM & OPERATIONS MODULE
-- =====================================================

-- Departments
CREATE TABLE IF NOT EXISTS `departments` (
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
CREATE TABLE IF NOT EXISTS `positions` (
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
CREATE TABLE IF NOT EXISTS `employees` (
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
CREATE TABLE IF NOT EXISTS `attendance` (
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
CREATE TABLE IF NOT EXISTS `time_logs` (
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
CREATE TABLE IF NOT EXISTS `events` (
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

-- =====================================================
-- 4. COMMUNICATION MODULE
-- =====================================================

-- Messages
CREATE TABLE IF NOT EXISTS `messages` (
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

-- Tickets
CREATE TABLE IF NOT EXISTS `tickets` (
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

-- Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
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
-- 5. TOOLS & UTILITIES MODULE
-- =====================================================

-- Custom Fields
CREATE TABLE IF NOT EXISTS `custom_fields` (
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

-- Email Templates
CREATE TABLE IF NOT EXISTS `email_templates` (
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
CREATE TABLE IF NOT EXISTS `finance_templates` (
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
CREATE TABLE IF NOT EXISTS `documents` (
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
CREATE TABLE IF NOT EXISTS `social_leads` (
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
-- 6. SYSTEM MODULE
-- =====================================================

-- Company Packages
CREATE TABLE IF NOT EXISTS `company_packages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `package_name` VARCHAR(255) NOT NULL,
  `features` JSON NULL,
  `price` DECIMAL(15, 2) NOT NULL,
  `billing_cycle` ENUM('Monthly', 'Quarterly', 'Yearly') DEFAULT 'Monthly',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_package_company` (`company_id`),
  INDEX `idx_package_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
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
-- VERIFICATION
-- =====================================================

-- To verify tables were created, you can run:
-- SHOW TABLES;
-- 
-- Or check specific tables:
-- SHOW TABLES LIKE 'contracts';
-- SHOW TABLES LIKE 'invoices';
-- etc.

-- All tables have been created successfully!
-- You can now use your CRM application with all required tables.

