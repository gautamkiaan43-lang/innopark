-- Add salary field to employees table if it doesn't exist
ALTER TABLE `employees` 
ADD COLUMN IF NOT EXISTS `salary` DECIMAL(15, 2) NULL AFTER `joining_date`;

