-- =====================================================
-- FRESH DATABASE IMPORT FOR crm_db_innopark
-- This will DROP all existing tables and recreate them
-- =====================================================

USE crm_db_innopark;

-- Disable foreign key checks to allow dropping tables
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all existing tables
DROP TABLE IF EXISTS `pwa_settings`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `time_logs`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `attendance_settings`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `event_attendees`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `ticket_replies`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `message_files`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `contract_items`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `expense_items`;
DROP TABLE IF EXISTS `estimates`;
DROP TABLE IF EXISTS `estimate_items`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `invoice_items`;
DROP TABLE IF EXISTS `credit_notes`;
DROP TABLE IF EXISTS `task_assignees`;
DROP TABLE IF EXISTS `task_tags`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `project_members`;
DROP TABLE IF EXISTS `project_labels`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `client_contacts`;
DROP TABLE IF EXISTS `client_managers`;
DROP TABLE IF EXISTS `client_groups`;
DROP TABLE IF EXISTS `client_labels`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `lead_managers`;
DROP TABLE IF EXISTS `lead_labels`;
DROP TABLE IF EXISTS `lead_sources`;
DROP TABLE IF EXISTS `lead_pipeline_stages`;
DROP TABLE IF EXISTS `lead_pipelines`;
DROP TABLE IF EXISTS `leads`;
DROP TABLE IF EXISTS `deal_contacts`;
DROP TABLE IF EXISTS `deal_pipeline_stages`;
DROP TABLE IF EXISTS `deal_pipelines`;
DROP TABLE IF EXISTS `deals`;
DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `contacts`;
DROP TABLE IF EXISTS `company_contacts`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `positions`;
DROP TABLE IF EXISTS `custom_fields`;
DROP TABLE IF EXISTS `custom_field_values`;
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
DROP TABLE IF EXISTS `bank_accounts`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `items`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- Now run the schema.sql file after this
-- =====================================================
