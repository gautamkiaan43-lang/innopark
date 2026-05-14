-- =====================================================
-- FIX TASK TABLE COLUMNS
-- Ensure all linking columns exist in tasks table
-- =====================================================

USE crm_db;

-- Add missing columns to tasks table
ALTER TABLE `tasks` 
ADD COLUMN IF NOT EXISTS `client_id` INT(10) UNSIGNED DEFAULT NULL AFTER `project_id`,
ADD COLUMN IF NOT EXISTS `lead_id` INT(10) UNSIGNED DEFAULT NULL AFTER `client_id`,
ADD COLUMN IF NOT EXISTS `deal_id` INT(10) UNSIGNED DEFAULT NULL AFTER `lead_id`,
ADD COLUMN IF NOT EXISTS `contact_id` INT(10) UNSIGNED DEFAULT NULL AFTER `deal_id`,
ADD COLUMN IF NOT EXISTS `related_company_id` INT(10) UNSIGNED DEFAULT NULL AFTER `contact_id`,
ADD COLUMN IF NOT EXISTS `points` INT(11) DEFAULT NULL AFTER `priority`;

-- Add indexes for performance
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_client` (`client_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_lead` (`lead_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_deal` (`deal_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_contact` (`contact_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_related_company` (`related_company_id`);
ALTER TABLE `tasks` ADD INDEX IF NOT EXISTS `idx_task_points` (`points`);

-- Verify columns
DESCRIBE `tasks`;
