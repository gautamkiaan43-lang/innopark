-- Add emergency contact and bank details fields to users table
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `emergency_contact_name` VARCHAR(255) NULL AFTER `address`,
ADD COLUMN IF NOT EXISTS `emergency_contact_phone` VARCHAR(50) NULL AFTER `emergency_contact_name`,
ADD COLUMN IF NOT EXISTS `emergency_contact_relation` VARCHAR(100) NULL AFTER `emergency_contact_phone`,
ADD COLUMN IF NOT EXISTS `bank_name` VARCHAR(255) NULL AFTER `emergency_contact_relation`,
ADD COLUMN IF NOT EXISTS `bank_account_number` VARCHAR(100) NULL AFTER `bank_name`,
ADD COLUMN IF NOT EXISTS `bank_ifsc` VARCHAR(50) NULL AFTER `bank_account_number`,
ADD COLUMN IF NOT EXISTS `bank_branch` VARCHAR(255) NULL AFTER `bank_ifsc`;

-- Create task_comments table for task comments
CREATE TABLE IF NOT EXISTS `task_comments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment` TEXT NOT NULL,
  `file_path` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_comment_task` (`task_id`),
  INDEX `idx_task_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_files table for task file uploads
CREATE TABLE IF NOT EXISTS `task_files` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` BIGINT NULL,
  `file_type` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_file_task` (`task_id`),
  INDEX `idx_task_file_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

