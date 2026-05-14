-- Add lead_id column to events table
ALTER TABLE `events` ADD COLUMN `lead_id` INT UNSIGNED NULL AFTER `host_id`;

-- Add foreign key constraint
ALTER TABLE `events` ADD CONSTRAINT `fk_events_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL;

-- Add index for better performance
ALTER TABLE `events` ADD INDEX `idx_event_lead` (`lead_id`);
