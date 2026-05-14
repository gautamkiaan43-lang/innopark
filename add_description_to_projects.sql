-- Add description column to projects table
ALTER TABLE `projects` 
ADD COLUMN IF NOT EXISTS `description` TEXT NULL AFTER `project_name`;

