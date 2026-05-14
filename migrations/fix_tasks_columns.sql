ALTER TABLE `tasks`
ADD COLUMN `assigned_to` INT UNSIGNED,
ADD COLUMN `reminder_datetime` DATETIME,
ADD COLUMN `related_to_type` ENUM('lead', 'deal', 'contact', 'company'),
ADD COLUMN `related_to_id` INT;

-- Try to add FK (might fail if data exists with user_id=0, so we do it separately or ignore error if fails)
-- We will just add index for now to be safe, FK is robust but risky on existing data without cleanup
ALTER TABLE `tasks` ADD INDEX `idx_tasks_assigned` (`assigned_to`);
ALTER TABLE `tasks` ADD INDEX `idx_tasks_related` (`related_to_type`, `related_to_id`);
