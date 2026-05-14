-- Add project_manager and budget fields to projects table
ALTER TABLE `projects` 
ADD COLUMN IF NOT EXISTS `project_manager_id` INT UNSIGNED NULL AFTER `department_id`,
ADD COLUMN IF NOT EXISTS `budget` DECIMAL(15, 2) NULL AFTER `progress`,
ADD FOREIGN KEY (`project_manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_project_manager` (`project_manager_id`);

