-- Add sent_at column to estimates table for tracking when proposals/estimates are sent
ALTER TABLE `estimates` ADD COLUMN `sent_at` DATETIME NULL AFTER `status`;

-- Add index for better query performance
ALTER TABLE `estimates` ADD INDEX `idx_estimates_sent_at` (`sent_at`);
