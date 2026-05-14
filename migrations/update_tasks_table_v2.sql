-- Add new columns to tasks table
ALTER TABLE `tasks` 
ADD COLUMN `category` ENUM('CRM', 'Project') DEFAULT 'CRM' AFTER `related_to_id`,
ADD COLUMN `project_id` INT DEFAULT NULL AFTER `category`,
MODIFY COLUMN `related_to_type` ENUM('lead', 'deal', 'contact', 'company', 'project') DEFAULT NULL;

-- Update existing tasks to have a category
UPDATE `tasks` SET `category` = 'CRM' WHERE `category` IS NULL;
